-- Fix: record "v_note" has no field "sync_pass_hash"
-- Drop stale functions (return type / %rowtype), then recreate. Run ALL in SQL Editor.

create extension if not exists pgcrypto;

alter table public.notes
  add column if not exists sync_id text,
  add column if not exists sync_pass_hash text;

drop function if exists public.note_vault_poll(uuid[], timestamptz);
drop function if exists public.note_vault_fetch(uuid, text, text);
drop function if exists public.note_vault_upsert(uuid, text, text, text, text, int, text);
drop function if exists public.note_sync_cookies_by_note_id(uuid, text, jsonb, text);
drop function if exists public.note_set_sync_pass(uuid, text);
drop function if exists public.note_verify_sync_pass(uuid, text);

-- === APPLY_RPC_SYNC_ONLY (inlined) ===

create or replace function public.note_verify_sync_pass(p_note_id uuid, p_pass text)
returns table (user_id uuid, note_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_pass_hash text; v_uid uuid; v_nid uuid;
begin
  select n.sync_pass_hash, n.user_id, n.id into v_pass_hash, v_uid, v_nid from public.notes n where n.id = p_note_id;
  if v_nid is null then raise exception 'note not found'; end if;
  if v_pass_hash is not null and v_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_pass_hash) <> v_pass_hash then raise exception 'invalid pass'; end if;
  end if;
  return query select v_uid, v_nid;
end; $$;
revoke all on function public.note_verify_sync_pass(uuid, text) from public;
grant execute on function public.note_verify_sync_pass(uuid, text) to anon, authenticated;

create or replace function public.note_sync_cookies_by_note_id(
  p_note_id uuid, p_pass text default null, p_snapshot jsonb default '[]'::jsonb, p_domain text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_pass_hash text;
begin
  select n.sync_pass_hash into v_pass_hash from public.notes n where n.id = p_note_id;
  if not found then raise exception 'note not found'; end if;
  if v_pass_hash is not null and v_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_pass_hash) <> v_pass_hash then raise exception 'invalid pass'; end if;
  end if;
  update public.notes set cookie_snapshot = coalesce(p_snapshot, '[]'::jsonb),
    sync_status = case when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced' else 'pending' end,
    synced_at = now(), domain = coalesce(nullif(trim(p_domain), ''), domain) where id = p_note_id;
  return jsonb_build_object('id', p_note_id, 'ok', true);
end; $$;
revoke all on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) from public;
grant execute on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) to anon, authenticated;

create or replace function public.note_set_sync_pass(p_note_id uuid, p_pass text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.notes set sync_pass_hash = case when p_pass is null or trim(p_pass) = '' then null else crypt(trim(p_pass), gen_salt('bf')) end
  where id = p_note_id and user_id = auth.uid();
  if not found then raise exception 'note not found'; end if;
end; $$;
revoke all on function public.note_set_sync_pass(uuid, text) from public;
grant execute on function public.note_set_sync_pass(uuid, text) to authenticated;

create or replace function public.note_vault_upsert(
  p_note_id uuid, p_domain text, p_pass text default null, p_ciphertext text default null,
  p_iv text default null, p_cookie_count int default 0, p_source_browser text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_row public.note_cookie_vault%rowtype;
begin
  if p_note_id is null or trim(p_domain) = '' then raise exception 'note_id and domain required'; end if;
  if p_ciphertext is null or p_iv is null then raise exception 'ciphertext and iv required'; end if;
  select user_id into v_uid from public.note_verify_sync_pass(p_note_id, p_pass);
  insert into public.note_cookie_vault (note_id, user_id, domain, ciphertext, iv, cookie_count, source_browser, updated_at)
  values (p_note_id, v_uid, trim(p_domain), p_ciphertext, p_iv, coalesce(p_cookie_count, 0), nullif(trim(p_source_browser), ''), now())
  on conflict (note_id, domain) do update set ciphertext = excluded.ciphertext, iv = excluded.iv,
    cookie_count = excluded.cookie_count, source_browser = excluded.source_browser, updated_at = now();
  select * into v_row from public.note_cookie_vault where note_id = p_note_id and domain = trim(p_domain);
  return jsonb_build_object('ok', true, 'note_id', v_row.note_id, 'domain', v_row.domain, 'cookie_count', v_row.cookie_count, 'updated_at', v_row.updated_at);
end; $$;
revoke all on function public.note_vault_upsert(uuid, text, text, text, text, int, text) from public;
grant execute on function public.note_vault_upsert(uuid, text, text, text, text, int, text) to anon, authenticated;

create or replace function public.note_vault_fetch(
  p_note_id uuid, p_domain text, p_pass text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_row public.note_cookie_vault%rowtype;
begin
  perform public.note_verify_sync_pass(p_note_id, p_pass);
  select * into v_row from public.note_cookie_vault where note_id = p_note_id and domain = trim(p_domain);
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'note_id', v_row.note_id, 'domain', v_row.domain, 'ciphertext', v_row.ciphertext,
    'iv', v_row.iv, 'cookie_count', v_row.cookie_count, 'source_browser', v_row.source_browser, 'updated_at', v_row.updated_at);
end; $$;
revoke all on function public.note_vault_fetch(uuid, text, text) from public;
grant execute on function public.note_vault_fetch(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
