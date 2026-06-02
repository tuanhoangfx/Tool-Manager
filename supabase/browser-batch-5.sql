
-- 20260527100000_fix_vault_upsert_user_id.sql
-- Fix cookie vault sync:
--   1) RLS policies on note_cookie_vault were missing in this project (RLS enabled
--      with zero policies → Postgres denies all authenticated access). Tool and
--      extension showed "No vault yet" even when rows existed.
--   2) note_vault_upsert used
--        `select user_id into v_uid from note_verify_sync_pass(...)`
--      which does not unpack the composite (`public.notes`) return value here
--      → v_uid ended up NULL or as the note_id, causing FK violations and
--      mismatched user_id on inserts.

update public.note_cookie_vault v
set user_id = n.user_id
from public.notes n
where v.note_id = n.id
  and (v.user_id is null or v.user_id <> n.user_id);

drop policy if exists "vault_select_own" on public.note_cookie_vault;
drop policy if exists "vault_insert_own" on public.note_cookie_vault;
drop policy if exists "vault_update_own" on public.note_cookie_vault;
drop policy if exists "vault_delete_own" on public.note_cookie_vault;

create policy "vault_select_own" on public.note_cookie_vault
  for select to authenticated
  using (user_id = auth.uid());

create policy "vault_insert_own" on public.note_cookie_vault
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "vault_update_own" on public.note_cookie_vault
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "vault_delete_own" on public.note_cookie_vault
  for delete to authenticated
  using (user_id = auth.uid());

drop function if exists public.note_vault_upsert(uuid, text, text, text, text, int, text, text);

create or replace function public.note_vault_upsert(
  p_note_id uuid,
  p_domain text,
  p_pass text default null,
  p_ciphertext text default null,
  p_iv text default null,
  p_cookie_count int default 0,
  p_source_browser text default null,
  p_updated_by text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_pass_hash text;
  v_row public.note_cookie_vault%rowtype;
begin
  if p_note_id is null or coalesce(trim(p_domain), '') = '' then
    raise exception 'note_id and domain required';
  end if;
  if p_ciphertext is null or p_iv is null then
    raise exception 'ciphertext and iv required';
  end if;

  select n.user_id, n.sync_pass_hash
    into v_user_id, v_pass_hash
  from public.notes n
  where n.id = p_note_id;

  if v_user_id is null then
    raise exception 'note not found';
  end if;
  if v_pass_hash is not null and v_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_pass_hash) <> v_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  insert into public.note_cookie_vault (
    note_id, user_id, domain, ciphertext, iv, cookie_count, source_browser, updated_by, updated_at
  )
  values (
    p_note_id, v_user_id, trim(p_domain), p_ciphertext, p_iv,
    coalesce(p_cookie_count, 0), nullif(trim(p_source_browser), ''), nullif(trim(p_updated_by), ''), now()
  )
  on conflict (note_id, domain) do update set
    user_id = excluded.user_id,
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    cookie_count = excluded.cookie_count,
    source_browser = excluded.source_browser,
    updated_by = excluded.updated_by,
    updated_at = now();

  select * into v_row from public.note_cookie_vault where note_id = p_note_id and domain = trim(p_domain);

  return jsonb_build_object(
    'ok', true,
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'cookie_count', v_row.cookie_count,
    'source_browser', v_row.source_browser,
    'updated_by', v_row.updated_by,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.note_vault_upsert(uuid, text, text, text, text, int, text, text) from public;
grant execute on function public.note_vault_upsert(uuid, text, text, text, text, int, text, text) to anon, authenticated;

notify pgrst, 'reload schema';


-- 20260527113000_note_cookie_vault_versioned_sync.sql
-- Versioned cookie vault sync.
-- Current vault remains a fast pointer; each accepted upload also creates an append-only version.
-- Facebook login vaults are promoted only when c_user/xs are present.

alter table public.note_cookie_vault
  add column if not exists vault_version uuid not null default gen_random_uuid(),
  add column if not exists has_facebook_login boolean not null default false,
  add column if not exists key_names text[] not null default '{}';

create table if not exists public.note_cookie_vault_versions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  ciphertext text not null,
  iv text not null,
  cookie_count int not null default 0,
  has_facebook_login boolean not null default false,
  key_names text[] not null default '{}',
  source_browser text,
  updated_by text,
  created_at timestamptz not null default now()
);

create index if not exists note_cookie_vault_versions_user_note_idx
  on public.note_cookie_vault_versions (user_id, note_id, domain, created_at desc);

alter table public.note_cookie_vault_versions enable row level security;

drop policy if exists "vault_versions_select_own" on public.note_cookie_vault_versions;
create policy "vault_versions_select_own" on public.note_cookie_vault_versions
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.note_cookie_vault_versions to authenticated;

create or replace function public.note_vault_upsert_v2(
  p_note_id uuid,
  p_domain text,
  p_pass text default null,
  p_ciphertext text default null,
  p_iv text default null,
  p_cookie_count int default 0,
  p_source_browser text default null,
  p_updated_by text default null,
  p_has_facebook_login boolean default false,
  p_key_names text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_pass_hash text;
  v_row public.note_cookie_vault%rowtype;
  v_domain text := trim(p_domain);
  v_is_facebook boolean := replace(lower(trim(p_domain)), '.', '') like '%facebookcom';
  v_version_id uuid;
begin
  if p_note_id is null or coalesce(v_domain, '') = '' then
    raise exception 'note_id and domain required';
  end if;
  if p_ciphertext is null or p_iv is null then
    raise exception 'ciphertext and iv required';
  end if;

  select user_id, sync_pass_hash
    into v_user_id, v_pass_hash
  from public.notes
  where id = p_note_id;

  if v_user_id is null then
    raise exception 'note not found';
  end if;

  if v_pass_hash is not null and v_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_pass_hash) <> v_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  insert into public.note_cookie_vault_versions (
    note_id,
    user_id,
    domain,
    ciphertext,
    iv,
    cookie_count,
    has_facebook_login,
    key_names,
    source_browser,
    updated_by
  )
  values (
    p_note_id,
    v_user_id,
    v_domain,
    p_ciphertext,
    p_iv,
    coalesce(p_cookie_count, 0),
    coalesce(p_has_facebook_login, false),
    coalesce(p_key_names, '{}'),
    nullif(trim(p_source_browser), ''),
    nullif(trim(p_updated_by), '')
  )
  returning id into v_version_id;

  if v_is_facebook and coalesce(p_has_facebook_login, false) is not true then
    return jsonb_build_object(
      'ok', true,
      'promoted', false,
      'reason', 'facebook_login_cookie_missing',
      'vault_version', v_version_id,
      'cookie_count', coalesce(p_cookie_count, 0)
    );
  end if;

  insert into public.note_cookie_vault (
    note_id,
    user_id,
    domain,
    ciphertext,
    iv,
    cookie_count,
    source_browser,
    updated_by,
    vault_version,
    has_facebook_login,
    key_names,
    updated_at
  )
  values (
    p_note_id,
    v_user_id,
    v_domain,
    p_ciphertext,
    p_iv,
    coalesce(p_cookie_count, 0),
    nullif(trim(p_source_browser), ''),
    nullif(trim(p_updated_by), ''),
    v_version_id,
    coalesce(p_has_facebook_login, false),
    coalesce(p_key_names, '{}'),
    now()
  )
  on conflict (note_id, domain) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    cookie_count = excluded.cookie_count,
    source_browser = excluded.source_browser,
    updated_by = excluded.updated_by,
    vault_version = excluded.vault_version,
    has_facebook_login = excluded.has_facebook_login,
    key_names = excluded.key_names,
    updated_at = now();

  select * into v_row
  from public.note_cookie_vault
  where note_id = p_note_id
    and domain = v_domain;

  return jsonb_build_object(
    'ok', true,
    'promoted', true,
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'cookie_count', v_row.cookie_count,
    'updated_at', v_row.updated_at,
    'updated_by', v_row.updated_by,
    'source_browser', v_row.source_browser,
    'vault_version', v_row.vault_version,
    'has_facebook_login', v_row.has_facebook_login,
    'key_names', v_row.key_names
  );
end;
$$;

revoke all on function public.note_vault_upsert_v2(uuid, text, text, text, text, int, text, text, boolean, text[]) from public;
grant execute on function public.note_vault_upsert_v2(uuid, text, text, text, text, int, text, text, boolean, text[]) to anon, authenticated;

create or replace function public.note_vault_fetch_v2(
  p_note_id uuid,
  p_domain text,
  p_pass text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.note_cookie_vault%rowtype;
begin
  perform public.note_verify_sync_pass(p_note_id, p_pass);

  select * into v_row
  from public.note_cookie_vault
  where note_id = p_note_id
    and domain = trim(p_domain);

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'ciphertext', v_row.ciphertext,
    'iv', v_row.iv,
    'cookie_count', v_row.cookie_count,
    'updated_at', v_row.updated_at,
    'updated_by', v_row.updated_by,
    'source_browser', v_row.source_browser,
    'vault_version', v_row.vault_version,
    'has_facebook_login', v_row.has_facebook_login,
    'key_names', v_row.key_names
  );
end;
$$;

revoke all on function public.note_vault_fetch_v2(uuid, text, text) from public;
grant execute on function public.note_vault_fetch_v2(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

