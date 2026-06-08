-- Add `save` source for explicit Save button snapshots (hash dedup like session, not like manual checkpoint).

alter table public.note_versions
  drop constraint if exists note_versions_source_check;

alter table public.note_versions
  add constraint note_versions_source_check
  check (source in ('session', 'interval', 'manual', 'restore', 'save'));

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
  if v_source not in ('session', 'interval', 'manual', 'restore', 'save') then
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
