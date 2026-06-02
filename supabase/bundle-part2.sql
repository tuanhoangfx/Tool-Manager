


-- 20260525133000_cookie_bridge_routes.sql
-- P0020 Cookie bridge routes: cloud-synced route metadata per user.
-- Secrets are intentionally excluded: sync pass stays local to each browser profile.

create table if not exists public.cookie_bridge_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  sync_id text,
  domain text not null,
  note_title text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, note_id, domain)
);

create index if not exists cookie_bridge_routes_user_updated_idx
  on public.cookie_bridge_routes (user_id, updated_at desc);

create index if not exists cookie_bridge_routes_note_idx
  on public.cookie_bridge_routes (note_id);

alter table public.cookie_bridge_routes enable row level security;

drop policy if exists "cookie_bridge_routes_select_own" on public.cookie_bridge_routes;
drop policy if exists "cookie_bridge_routes_insert_own" on public.cookie_bridge_routes;
drop policy if exists "cookie_bridge_routes_update_own" on public.cookie_bridge_routes;
drop policy if exists "cookie_bridge_routes_delete_own" on public.cookie_bridge_routes;

create policy "cookie_bridge_routes_select_own" on public.cookie_bridge_routes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "cookie_bridge_routes_insert_own" on public.cookie_bridge_routes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

create policy "cookie_bridge_routes_update_own" on public.cookie_bridge_routes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

create policy "cookie_bridge_routes_delete_own" on public.cookie_bridge_routes
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.cookie_bridge_routes to authenticated;

create or replace function public.cookie_bridge_routes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cookie_bridge_routes_updated_at on public.cookie_bridge_routes;
create trigger cookie_bridge_routes_updated_at
  before update on public.cookie_bridge_routes
  for each row
  execute function public.cookie_bridge_routes_set_updated_at();

notify pgrst, 'reload schema';


-- 20260525165000_cookie_bridge_agents.sql
-- E0001 Cookie Bridge browser agents.
-- Each linked extension profile heartbeats here and consumes user-scoped commands.

create table if not exists public.cookie_bridge_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  browser_id text not null,
  label text,
  extension_version text,
  route_count integer not null default 0,
  selected_note_id text,
  session_ready boolean not null default false,
  facebook_cookie_count integer not null default 0,
  facebook_has_login boolean not null default false,
  last_route_pull_at timestamptz,
  last_sync_at timestamptz,
  last_vault_apply_at timestamptz,
  last_command_at timestamptz,
  last_error text,
  status jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, browser_id)
);

create table if not exists public.cookie_bridge_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_browser_id text,
  command text not null,
  note_id uuid,
  domain text not null default '.facebook.com',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  claimed_by text,
  claimed_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cookie_bridge_agents_user_seen_idx
  on public.cookie_bridge_agents (user_id, last_seen_at desc);

create index if not exists cookie_bridge_commands_user_status_idx
  on public.cookie_bridge_commands (user_id, status, created_at desc);

create index if not exists cookie_bridge_commands_target_idx
  on public.cookie_bridge_commands (target_browser_id, status, created_at);

alter table public.cookie_bridge_agents enable row level security;
alter table public.cookie_bridge_commands enable row level security;

drop policy if exists "cookie_bridge_agents_select_own" on public.cookie_bridge_agents;
drop policy if exists "cookie_bridge_agents_insert_own" on public.cookie_bridge_agents;
drop policy if exists "cookie_bridge_agents_update_own" on public.cookie_bridge_agents;
drop policy if exists "cookie_bridge_agents_delete_own" on public.cookie_bridge_agents;

create policy "cookie_bridge_agents_select_own" on public.cookie_bridge_agents
  for select to authenticated
  using (auth.uid() = user_id);

create policy "cookie_bridge_agents_insert_own" on public.cookie_bridge_agents
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "cookie_bridge_agents_update_own" on public.cookie_bridge_agents
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cookie_bridge_agents_delete_own" on public.cookie_bridge_agents
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cookie_bridge_commands_select_own" on public.cookie_bridge_commands;
drop policy if exists "cookie_bridge_commands_insert_own" on public.cookie_bridge_commands;
drop policy if exists "cookie_bridge_commands_update_own" on public.cookie_bridge_commands;
drop policy if exists "cookie_bridge_commands_delete_own" on public.cookie_bridge_commands;

create policy "cookie_bridge_commands_select_own" on public.cookie_bridge_commands
  for select to authenticated
  using (auth.uid() = user_id);

create policy "cookie_bridge_commands_insert_own" on public.cookie_bridge_commands
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "cookie_bridge_commands_update_own" on public.cookie_bridge_commands
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "cookie_bridge_commands_delete_own" on public.cookie_bridge_commands
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.cookie_bridge_agents to authenticated;
grant select, insert, update, delete on public.cookie_bridge_commands to authenticated;

create or replace function public.cookie_bridge_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cookie_bridge_agents_updated_at on public.cookie_bridge_agents;
create trigger cookie_bridge_agents_updated_at
  before update on public.cookie_bridge_agents
  for each row
  execute function public.cookie_bridge_set_updated_at();

drop trigger if exists cookie_bridge_commands_updated_at on public.cookie_bridge_commands;
create trigger cookie_bridge_commands_updated_at
  before update on public.cookie_bridge_commands
  for each row
  execute function public.cookie_bridge_set_updated_at();

notify pgrst, 'reload schema';


-- 20260525172500_cookie_bridge_source_lock.sql
-- Cookie bridge source lock.
-- Only the selected source browser may publish/promote a login vault for a route.

alter table public.cookie_bridge_routes
  add column if not exists source_browser_id text,
  add column if not exists source_label text,
  add column if not exists source_locked_at timestamptz;

create index if not exists cookie_bridge_routes_source_idx
  on public.cookie_bridge_routes (user_id, source_browser_id)
  where source_browser_id is not null;

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
  v_source_browser text := nullif(trim(p_source_browser), '');
  v_locked_source text;
  v_route_count int := 0;
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

  select source_browser_id
    into v_locked_source
  from public.cookie_bridge_routes
  where user_id = v_user_id
    and note_id = p_note_id
    and domain = v_domain
    and enabled is true
  limit 1;

  get diagnostics v_route_count = row_count;

  if v_is_facebook and (v_route_count = 0 or v_locked_source is null) then
    return jsonb_build_object(
      'ok', false,
      'promoted', false,
      'reason', 'source_browser_unset',
      'attempted_source_browser', v_source_browser,
      'cookie_count', coalesce(p_cookie_count, 0)
    );
  end if;

  if v_locked_source is not null and coalesce(v_source_browser, '') <> v_locked_source then
    return jsonb_build_object(
      'ok', false,
      'promoted', false,
      'reason', 'source_browser_locked',
      'source_browser_id', v_locked_source,
      'attempted_source_browser', v_source_browser,
      'cookie_count', coalesce(p_cookie_count, 0)
    );
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
    v_source_browser,
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
    v_source_browser,
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

notify pgrst, 'reload schema';


-- 20260526100000_note_cookie_vault_updated_by.sql
-- Vault updated_by column + RPC signature (extension v0.5.17+)

alter table public.note_cookie_vault
  add column if not exists updated_by text;

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
  v_uid uuid;
  v_row public.note_cookie_vault%rowtype;
begin
  select user_id into v_uid from public.note_verify_sync_pass(p_note_id, p_pass);
  insert into public.note_cookie_vault (
    note_id, user_id, domain, ciphertext, iv, cookie_count, source_browser, updated_by, updated_at
  )
  values (
    p_note_id, v_uid, trim(p_domain), p_ciphertext, p_iv,
    coalesce(p_cookie_count, 0), nullif(trim(p_source_browser), ''), nullif(trim(p_updated_by), ''), now()
  )
  on conflict (note_id, domain) do update set
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

drop function if exists public.note_vault_fetch(uuid, text, text);

create or replace function public.note_vault_fetch(
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
  select * into v_row from public.note_cookie_vault
  where note_id = p_note_id and domain = trim(p_domain);
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
    'source_browser', v_row.source_browser,
    'updated_by', v_row.updated_by,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.note_vault_fetch(uuid, text, text) from public;
grant execute on function public.note_vault_fetch(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';


-- 20260526101631_workspace_user_directory.sql


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
  p_pass text d