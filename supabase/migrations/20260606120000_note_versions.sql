-- Note version history (append-only snapshots).
-- Autosave continues updating public.notes directly; versions are created only via RPC
-- on session boundary, interval coalesce, manual checkpoint, or pre-restore backup.
--
-- Storage estimate (rough):
--   avg snapshot ~4 KB (title + body_md)
--   1 000 notes × 30 versions × 4 KB ≈ 120 MB
--   with session + hash dedup, typical active note keeps ~5–12 versions ≈ 20–48 MB / 1k notes

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.note_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  body_md text not null default '',
  content_hash text not null,
  source text not null default 'session'
    check (source in ('session', 'interval', 'manual', 'restore')),
  label text,
  created_at timestamptz not null default now()
);

create index if not exists note_versions_note_created_idx
  on public.note_versions (note_id, created_at desc);

create index if not exists note_versions_user_note_idx
  on public.note_versions (user_id, note_id, created_at desc);

create index if not exists note_versions_note_hash_idx
  on public.note_versions (note_id, content_hash, created_at desc);

alter table public.note_versions enable row level security;

drop policy if exists "note_versions_select_own" on public.note_versions;
create policy "note_versions_select_own" on public.note_versions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "note_versions_insert_own" on public.note_versions;
create policy "note_versions_insert_own" on public.note_versions
  for insert to authenticated
  with check (user_id = auth.uid());

grant select, insert on public.note_versions to authenticated;

create or replace function public.note_version_content_hash(p_title text, p_body_md text)
returns text
language plpgsql
immutable
parallel safe
set search_path = public, extensions
as $$
begin
  return encode(
    extensions.digest(
      coalesce(trim(p_title), '') || E'\n' || coalesce(p_body_md, ''),
      'sha256'
    ),
    'hex'
  );
end;
$$;

create or replace function public.note_versions_enforce_retention(
  p_note_id uuid,
  p_max_auto_versions integer default 50,
  p_auto_retention_days integer default 90
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_auto_retention_days, 1));
begin
  delete from public.note_versions
  where note_id = p_note_id
    and source <> 'manual'
    and created_at < v_cutoff;

  delete from public.note_versions nv
  where nv.id in (
    select id
    from (
      select
        id,
        row_number() over (
          partition by note_id
          order by created_at desc
        ) as rn
      from public.note_versions
      where note_id = p_note_id
        and source <> 'manual'
    ) ranked
    where ranked.rn > greatest(p_max_auto_versions, 1)
  );
end;
$$;

create or replace function public.note_create_version_if_changed(
  p_note_id uuid,
  p_source text default 'session',
  p_label text default null,
  p_min_interval_minutes integer default 15,
  p_title text default null,
  p_body_md text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_note public.notes%rowtype;
  v_title text;
  v_body text;
  v_hash text;
  v_last public.note_versions%rowtype;
  v_source text := lower(trim(coalesce(p_source, 'session')));
  v_label text := nullif(trim(p_label), '');
  v_version_id uuid;
  v_interval interval;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_note_id is null then
    raise exception 'note_id required';
  end if;
  if v_source not in ('session', 'interval', 'manual', 'restore') then
    raise exception 'invalid source';
  end if;

  select * into v_note
  from public.notes
  where id = p_note_id and user_id = v_user_id;

  if not found then
    raise exception 'note not found';
  end if;

  v_title := coalesce(nullif(trim(p_title), ''), v_note.title, '');
  v_body := coalesce(p_body_md, v_note.body_md, '');
  v_hash := public.note_version_content_hash(v_title, v_body);

  select * into v_last
  from public.note_versions
  where note_id = p_note_id
  order by created_at desc
  limit 1;

  if v_source <> 'manual' and v_last.id is not null and v_last.content_hash = v_hash then
    return jsonb_build_object(
      'ok', true,
      'created', false,
      'reason', 'duplicate_content',
      'content_hash', v_hash,
      'last_version_id', v_last.id
    );
  end if;

  if v_source = 'interval' and v_last.id is not null then
    v_interval := make_interval(mins => greatest(coalesce(p_min_interval_minutes, 15), 1));
    if v_last.created_at > now() - v_interval then
      return jsonb_build_object(
        'ok', true,
        'created', false,
        'reason', 'interval_not_elapsed',
        'content_hash', v_hash,
        'last_version_id', v_last.id
      );
    end if;
  end if;

  insert into public.note_versions (
    note_id,
    user_id,
    title,
    body_md,
    content_hash,
    source,
    label
  )
  values (
    p_note_id,
    v_user_id,
    v_title,
    v_body,
    v_hash,
    v_source,
    case when v_source = 'manual' then v_label else null end
  )
  returning id into v_version_id;

  perform public.note_versions_enforce_retention(p_note_id);

  return jsonb_build_object(
    'ok', true,
    'created', true,
    'version_id', v_version_id,
    'source', v_source,
    'content_hash', v_hash
  );
end;
$$;

create or replace function public.note_versions_list(
  p_note_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_rows jsonb;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1 from public.notes
    where id = p_note_id and user_id = v_user_id
  ) then
    raise exception 'note not found';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', nv.id,
        'note_id', nv.note_id,
        'title', nv.title,
        'body_preview', left(nv.body_md, 280),
        'body_length', length(nv.body_md),
        'content_hash', nv.content_hash,
        'source', nv.source,
        'label', nv.label,
        'created_at', nv.created_at
      )
      order by nv.created_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select *
    from public.note_versions
    where note_id = p_note_id and user_id = v_user_id
    order by created_at desc
    limit greatest(coalesce(p_limit, 50), 1)
  ) nv;

  return jsonb_build_object('ok', true, 'versions', v_rows);
end;
$$;

create or replace function public.note_version_get(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.note_versions%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_row
  from public.note_versions
  where id = p_version_id and user_id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'version', jsonb_build_object(
      'id', v_row.id,
      'note_id', v_row.note_id,
      'title', v_row.title,
      'body_md', v_row.body_md,
      'content_hash', v_row.content_hash,
      'source', v_row.source,
      'label', v_row.label,
      'created_at', v_row.created_at
    )
  );
end;
$$;

create or replace function public.note_version_restore(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_version public.note_versions%rowtype;
  v_note public.notes%rowtype;
  v_backup jsonb;
  v_row public.notes%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select * into v_version
  from public.note_versions
  where id = p_version_id and user_id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'version_not_found');
  end if;

  select * into v_note
  from public.notes
  where id = v_version.note_id and user_id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'note_not_found');
  end if;

  v_backup := public.note_create_version_if_changed(
    v_note.id,
    'restore',
    null,
    15,
    v_note.title,
    v_note.body_md
  );

  update public.notes
  set
    title = v_version.title,
    body_md = v_version.body_md
  where id = v_note.id and user_id = v_user_id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'note', jsonb_build_object(
      'id', v_row.id,
      'title', v_row.title,
      'slug', v_row.slug,
      'body_md', v_row.body_md,
      'updated_at', v_row.updated_at
    ),
    'restored_from', v_version.id,
    'backup', v_backup
  );
end;
$$;

revoke all on function public.note_version_content_hash(text, text) from public;
grant execute on function public.note_version_content_hash(text, text) to authenticated;

revoke all on function public.note_versions_enforce_retention(uuid, integer, integer) from public;
grant execute on function public.note_versions_enforce_retention(uuid, integer, integer) to authenticated;

revoke all on function public.note_create_version_if_changed(uuid, text, text, integer, text, text) from public;
grant execute on function public.note_create_version_if_changed(uuid, text, text, integer, text, text) to authenticated;

revoke all on function public.note_versions_list(uuid, integer) from public;
grant execute on function public.note_versions_list(uuid, integer) to authenticated;

revoke all on function public.note_version_get(uuid) from public;
grant execute on function public.note_version_get(uuid) to authenticated;

revoke all on function public.note_version_restore(uuid) from public;
grant execute on function public.note_version_restore(uuid) to authenticated;
