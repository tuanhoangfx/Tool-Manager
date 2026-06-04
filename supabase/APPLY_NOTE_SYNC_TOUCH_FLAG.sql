-- Run in Supabase SQL Editor — stops mass notes.synced_at bumps without manual extension Sync.
-- Source: migrations/20260604220000_note_sync_touch_synced_at_flag.sql

drop function if exists public.note_sync_cookies(text, text, jsonb, text);
drop function if exists public.note_sync_cookies_by_note_id(uuid, text, jsonb, text);

create or replace function public.note_sync_cookies(
  p_sync_id text,
  p_pass text default null,
  p_snapshot jsonb default '[]'::jsonb,
  p_domain text default null,
  p_touch_synced_at boolean default false
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
    sync_status = case
      when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced'
      else 'pending'
    end,
    synced_at = case when coalesce(p_touch_synced_at, false) then now() else synced_at end,
    domain = coalesce(nullif(trim(p_domain), ''), domain)
  where id = v_note.id;

  return jsonb_build_object('id', v_note.id, 'sync_id', v_note.sync_id, 'ok', true);
end;
$$;

create or replace function public.note_sync_cookies_by_note_id(
  p_note_id uuid,
  p_pass text default null,
  p_snapshot jsonb default '[]'::jsonb,
  p_domain text default null,
  p_touch_synced_at boolean default false
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
    sync_status = case
      when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced'
      else 'pending'
    end,
    synced_at = case when coalesce(p_touch_synced_at, false) then now() else synced_at end,
    domain = coalesce(nullif(trim(p_domain), ''), domain)
  where id = v_note.id;

  return jsonb_build_object('id', v_note.id, 'ok', true);
end;
$$;

revoke all on function public.note_sync_cookies(text, text, jsonb, text, boolean) from public;
grant execute on function public.note_sync_cookies(text, text, jsonb, text, boolean) to anon, authenticated;

revoke all on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text, boolean) from public;
grant execute on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text, boolean) to anon, authenticated;
