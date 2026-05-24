-- =============================================================================
-- P0020 — Paste into Supabase Dashboard → SQL Editor → Run
-- Fixes: column notes.sync_id does not exist
-- =============================================================================

-- Sync ID + pass columns
alter table public.notes
  add column if not exists sync_id text,
  add column if not exists sync_pass_hash text;

create unique index if not exists notes_sync_id_idx on public.notes (sync_id) where sync_id is not null;

update public.notes
set sync_id = 'TM-' || substr(replace(id::text, '-', ''), 1, 8)
where sync_id is null or trim(sync_id) = '';

-- RPC: by Sync ID (extension default)
create extension if not exists pgcrypto;

create or replace function public.note_sync_cookies(
  p_sync_id text,
  p_pass text default null,
  p_snapshot jsonb default '[]'::jsonb,
  p_domain text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  if p_sync_id is null or trim(p_sync_id) = '' then
    raise exception 'sync_id required';
  end if;

  select * into v_note from public.notes where sync_id = trim(p_sync_id);
  if not found then
    raise exception 'note not found';
  end if;

  if v_note.sync_pass_hash is not null and v_note.sync_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_note.sync_pass_hash) <> v_note.sync_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  update public.notes
  set
    cookie_snapshot = coalesce(p_snapshot, '[]'::jsonb),
    sync_status = case when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced' else 'pending' end,
    synced_at = now(),
    domain = coalesce(nullif(trim(p_domain), ''), domain)
  where id = v_note.id;

  return jsonb_build_object('id', v_note.id, 'sync_id', v_note.sync_id, 'ok', true);
end;
$$;

revoke all on function public.note_sync_cookies(text, text, jsonb, text) from public;
grant execute on function public.note_sync_cookies(text, text, jsonb, text) to anon, authenticated;

-- RPC: by Note UUID (works immediately after columns above)
create or replace function public.note_sync_cookies_by_note_id(
  p_note_id uuid,
  p_pass text default null,
  p_snapshot jsonb default '[]'::jsonb,
  p_domain text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  if p_note_id is null then
    raise exception 'note_id required';
  end if;

  select * into v_note from public.notes where id = p_note_id;
  if not found then
    raise exception 'note not found';
  end if;

  if v_note.sync_pass_hash is not null and v_note.sync_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_note.sync_pass_hash) <> v_note.sync_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  update public.notes
  set
    cookie_snapshot = coalesce(p_snapshot, '[]'::jsonb),
    sync_status = case when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced' else 'pending' end,
    synced_at = now(),
    domain = coalesce(nullif(trim(p_domain), ''), domain)
  where id = v_note.id;

  return jsonb_build_object('id', v_note.id, 'sync_id', v_note.sync_id, 'ok', true);
end;
$$;

revoke all on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) from public;
grant execute on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) to anon, authenticated;

-- Set sync pass from app (authenticated)
create or replace function public.note_set_sync_pass(p_note_id uuid, p_pass text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.notes
  set sync_pass_hash = case
    when p_pass is null or trim(p_pass) = '' then null
    else crypt(trim(p_pass), gen_salt('bf'))
  end
  where id = p_note_id and user_id = auth.uid();
  if not found then
    raise exception 'note not found';
  end if;
end;
$$;

revoke all on function public.note_set_sync_pass(uuid, text) from public;
grant execute on function public.note_set_sync_pass(uuid, text) to authenticated;

-- Realtime (optional)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notes;
  end if;
exception
  when duplicate_object then null;
end $$;
