efault null,
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


-- 20260528120000_secure_public_share_and_retention.sql
-- Secure public note share + retention helpers.
-- Public clients call note_public_share_get instead of selecting notes directly.

create extension if not exists pgcrypto;

drop policy if exists "notes_share_public" on public.notes;
revoke select on public.notes from anon;

create or replace function public.note_public_share_get(
  p_token text,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_unlocked boolean := false;
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_token');
  end if;

  select *
    into v_note
  from public.notes
  where share_token = trim(p_token)
    and share_enabled is true
    and (share_expires_at is null or share_expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_note.share_password_hash is null or v_note.share_password_hash = '' then
    v_unlocked := true;
  elsif p_password is not null and
    encode(digest(v_note.id::text || ':' || trim(p_password), 'sha256'), 'hex') = v_note.share_password_hash then
    v_unlocked := true;
  end if;

  if not v_unlocked then
    return jsonb_build_object(
      'ok', true,
      'locked', true,
      'note', jsonb_build_object(
        'id', v_note.id,
        'title', v_note.title,
        'body_md', '',
        'cookie_snapshot', '[]'::jsonb,
        'share_enabled', v_note.share_enabled,
        'share_token', v_note.share_token,
        'requires_password', true
      )
    );
  end if;

  update public.notes
  set share_view_count = coalesce(share_view_count, 0) + 1
  where id = v_note.id;

  return jsonb_build_object(
    'ok', true,
    'locked', false,
    'note', jsonb_build_object(
      'id', v_note.id,
      'title', v_note.title,
      'body_md', v_note.body_md,
      'cookie_snapshot', v_note.cookie_snapshot,
      'share_enabled', v_note.share_enabled,
      'share_token', v_note.share_token,
      'requires_password', false
    )
  );
end;
$$;

revoke all on function public.note_public_share_get(text, text) from public;
grant execute on function public.note_public_share_get(text, text) to anon, authenticated;

create index if not exists notes_share_token_enabled_idx
  on public.notes (share_token)
  where share_enabled is true and share_token is not null;

create or replace function public.cookie_bridge_cleanup_retention(
  p_command_days integer default 14,
  p_vault_version_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commands_deleted integer := 0;
  v_versions_deleted integer := 0;
begin
  delete from public.cookie_bridge_commands
  where created_at < now() - make_interval(days => greatest(p_command_days, 1))
    and status in ('done', 'failed', 'cancelled');
  get diagnostics v_commands_deleted = row_count;

  delete from public.note_cookie_vault_versions
  where created_at < now() - make_interval(days => greatest(p_vault_version_days, 1));
  get diagnostics v_versions_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'commands_deleted', v_commands_deleted,
    'vault_versions_deleted', v_versions_deleted
  );
end;
$$;

revoke all on function public.cookie_bridge_cleanup_retention(integer, integer) from public;
grant execute on function public.cookie_bridge_cleanup_retention(integer, integer) to authenticated;

notify pgrst, 'reload schema';


-- 20260528153000_note_cookie_members.sql
-- Note-level cookie sharing.
-- Note ID is the invite/add identifier; permissions live here, not in public note share.

create table if not exists public.note_cookie_members (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  grantee_user_id uuid references auth.users (id) on delete cascade,
  grantee_email text,
  can_apply boolean not null default true,
  can_publish boolean not null default false,
  can_manage boolean not null default false,
  expires_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint note_cookie_members_grantee_required
    check (grantee_user_id is not null or nullif(trim(coalesce(grantee_email, '')), '') is not null)
);

create unique index if not exists note_cookie_members_note_user_idx
  on public.note_cookie_members (note_id, grantee_user_id)
  where grantee_user_id is not null;

create unique index if not exists note_cookie_members_note_email_idx
  on public.note_cookie_members (note_id, lower(grantee_email))
  where grantee_email is not null;

create index if not exists note_cookie_members_owner_idx
  on public.note_cookie_members (owner_user_id, note_id);

create index if not exists note_cookie_members_grantee_idx
  on public.note_cookie_members (grantee_user_id, expires_at);

alter table public.note_cookie_members enable row level security;

drop policy if exists "note_cookie_members_select_allowed" on public.note_cookie_members;
drop policy if exists "note_cookie_members_insert_owner" on public.note_cookie_members;
drop policy if exists "note_cookie_members_update_owner" on public.note_cookie_members;
drop policy if exists "note_cookie_members_delete_owner" on public.note_cookie_members;

create policy "note_cookie_members_select_allowed" on public.note_cookie_members
  for select to authenticated
  using (
    owner_user_id = auth.uid()
    or grantee_user_id = auth.uid()
    or lower(coalesce(grantee_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "note_cookie_members_insert_owner" on public.note_cookie_members
  for insert to authenticated
  with check (
    owner_user_id = auth.uid()
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

create policy "note_cookie_members_update_owner" on public.note_cookie_members
  for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "note_cookie_members_delete_owner" on public.note_cookie_members
  for delete to authenticated
  using (owner_user_id = auth.uid());

grant select, insert, update, delete on public.note_cookie_members to authenticated;

create or replace function public.note_cookie_members_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists note_cookie_members_updated_at on public.note_cookie_members;
create trigger note_cookie_members_updated_at
  before update on public.note_cookie_members
  for each row
  execute function public.note_cookie_members_set_updated_at();

create or replace function public.note_cookie_member_matches(m public.note_cookie_members)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (m.expires_at is null or m.expires_at > now())
    and (
      m.grantee_user_id = auth.uid()
      or lower(coalesce(m.grantee_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

create or replace function public.note_cookie_can(
  p_note_id uuid,
  p_action text default 'apply'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  if auth.uid() is null or p_note_id is null then
    return false;
  end if;

  select * into v_note from public.notes where id = p_note_id;
  if not found then
    return false;
  end if;

  if v_note.user_id = auth.uid() then
    return true;
  end if;

  return exists (
    select 1
    from public.note_cookie_members m
    where m.note_id = p_note_id
      and public.note_cookie_member_matches(m)
      and case lower(coalesce(p_action, 'apply'))
        when 'publish' then m.can_publish
        when 'manage' then m.can_manage
        else m.can_apply
      end
  );
end;
$$;

create or replace function public.note_cookie_member_list(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_rows jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select user_id into v_owner from public.notes where id = p_note_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'note_not_found');
  end if;
  if v_owner <> auth.uid() and not public.note_cookie_can(p_note_id, 'manage') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc), '[]'::jsonb)
    into v_rows
  from public.note_cookie_members m
  where m.note_id = p_note_id;

  return jsonb_build_object('ok', true, 'members', v_rows);
end;
$$;

create or replace function public.note_cookie_member_upsert(
  p_note_id uuid,
  p_grantee_email text,
  p_can_apply boolean default true,
  