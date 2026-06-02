-- P0020 Data Box bundle

-- 20260523120000_tool_manager_notes.sql
-- P0020-Data-Box — notes table + RLS
-- Apply: Supabase Dashboard → SQL Editor → Run this file

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  slug text not null default '',
  domain text not null default '',
  body_md text not null default '',
  cookie_snapshot jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  share_enabled boolean not null default false,
  share_token text,
  sync_status text not null default 'manual'
    check (sync_status in ('manual', 'synced', 'pending', 'error')),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notes_user_slug_idx on public.notes (user_id, slug);
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own" on public.notes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_own" on public.notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.notes to authenticated;

create or replace function public.notes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row
  execute function public.notes_set_updated_at();


-- 20260523140000_notes_share_public.sql
-- Sprint 3: public share + password hash

alter table public.notes
  add column if not exists share_password_hash text,
  add column if not exists share_expires_at timestamptz,
  add column if not exists share_view_count int not null default 0;

drop policy if exists "notes_share_public" on public.notes;

create policy "notes_share_public" on public.notes
  for select to anon
  using (
    share_enabled = true
    and share_token is not null
    and (share_expires_at is null or share_expires_at > now())
  );

grant select on public.notes to anon;


-- 20260523150000_notes_sync_id_pass.sql
-- Notes sync: ID + pass (extension auth per note)

alter table public.notes
  add column if not exists sync_id text,
  add column if not exists sync_pass_hash text;

create unique index if not exists notes_sync_id_idx on public.notes (sync_id) where sync_id is not null;

-- Backfill sync_id for existing rows
update public.notes
set sync_id = 'TM-' || substr(replace(id::text, '-', ''), 1, 8)
where sync_id is null or sync_id = '';


-- 20260523160000_note_sync_cookies_rpc.sql
-- RPC: extension pushes cookie snapshot via sync_id + optional pass (no user JWT)

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

-- Helper: hash pass when user sets sync pass on note (from authenticated client)
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

-- Auto sync_id on insert
create or replace function public.notes_assign_sync_id()
returns trigger
language plpgsql
as $$
begin
  if new.sync_id is null or trim(new.sync_id) = '' then
    new.sync_id := 'TM-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;
  return new;
end;
$$;

drop trigger if exists notes_assign_sync_id on public.notes;
create trigger notes_assign_sync_id
  before insert on public.notes
  for each row
  execute function public.notes_assign_sync_id();


-- 20260524100000_notes_realtime.sql
-- Enable Realtime on notes (cookie_snapshot / sync_status updates from extension RPC)

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notes;
  end if;
exception
  when duplicate_object then null;
end $$;


-- 20260524120000_note_sync_cookies_by_note_id.sql
-- RPC: extension pushes cookies by Note UUID (when sync_id column missing or preferred)

create extension if not exists pgcrypto;

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

  return jsonb_build_object('id', v_note.id, 'ok', true);
end;
$$;

revoke all on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) from public;
grant execute on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) to anon, authenticated;


-- 20260525100000_note_cookie_vault_v4.sql
-- V4: Encrypted cookie vault (AES-GCM ciphertext) + RPC for extension cross-browser apply

create table if not exists public.note_cookie_vault (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  ciphertext text not null,
  iv text not null,
  cookie_count int not null default 0,
  source_browser text,
  updated_at timestamptz not null default now(),
  unique (note_id, domain)
);

create index if not exists note_cookie_vault_user_updated_idx
  on public.note_cookie_vault (user_id, updated_at desc);

alter table public.note_cookie_vault enable row level security;

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

grant select, insert, update, delete on public.note_cookie_vault to authenticated;

-- Verify sync pass (same rules as note_sync_cookies)
create or replace function public.note_verify_sync_pass(p_note_id uuid, p_pass text)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  select * into v_note from public.notes where id = p_note_id;
  if not found then
    raise exception 'note not found';
  end if;
  if v_note.sync_pass_hash is not null and v_note.sync_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_note.sync_pass_hash) <> v_note.sync_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;
  return v_note;
end;
$$;

-- Extension upserts encrypted vault (anon + pass)
create or replace function public.note_vault_upsert(
  p_note_id uuid,
  p_domain text,
  p_pass text default null,
  p_ciphertext text default null,
  p_iv text default null,
  p_cookie_count int default 0,
  p_source_browser text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes;
  v_row public.note_cookie_vault%rowtype;
begin
  if p_note_id is null or trim(p_domain) = '' then
    raise exception 'note_id and domain required';
  end if;
  if p_ciphertext is null or p_iv is null then
    raise exception 'ciphertext and iv required';
  end if;

  v_note := note_verify_sync_pass(p_note_id, p_pass);

  insert into public.note_cookie_vault (
    note_id, user_id, domain, ciphertext, iv, cookie_count, source_browser, updated_at
  )
  values (
    p_note_id,
    v_note.user_id,
    trim(p_domain),
    p_ciphertext,
    p_iv,
    coalesce(p_cookie_count, 0),
    nullif(trim(p_source_browser), ''),
    now()
  )
  on conflict (note_id, domain) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    cookie_count = excluded.cookie_count,
    source_browser = excluded.source_browser,
    updated_at = now();

  select * into v_row from public.note_cookie_vault
  where note_id = p_note_id and domain = trim(p_domain);

  return jsonb_build_object(
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'cookie_count', v_row.cookie_count,
    'updated_at', v_row.updated_at,
    'ok', true
  );
end;
$$;

revoke all on function public.note_vault_upsert(uuid, text, text, text, text, int, text) from public;
grant execute on function public.note_vault_upsert(uuid, text, text, text, text, int, text) to anon, authenticated;

-- Extension fetches vault for decrypt + apply on other browser
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
  perform note_verify_sync_pass(p_note_id, p_pass);

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
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.note_vault_fetch(uuid, text, text) from public;
grant execute on function public.note_vault_fetch(uuid, text, text) to anon, authenticated;

-- Poll: vaults updated after timestamp (JWT — owner only)
create or replace function public.note_vault_poll(
  p_note_ids uuid[],
  p_since timestamptz default null
)
returns setof public.note_cookie_vault
language sql
security definer
set search_path = public
as $$
  select v.*
  from public.note_cookie_vault v
  inner join public.notes n on n.id = v.note_id
  where n.user_id = auth.uid()
    and v.note_id = any (p_note_ids)
    and (p_since is null or v.updated_at > p_since);
$$;

revoke all on function public.note_vault_poll(uuid[], timestamptz) from public;
grant execute on function public.note_vault_poll(uuid[], timestamptz) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.note_cookie_vault;
  end if;
exception
  when duplicate_object then null;
end $$;


-- 20260525103000_note_folders.sql
-- P0020 Notes folders: synced folder metadata + note assignment

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#818cf8',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.note_folder_notes (
  note_id uuid primary key references public.notes (id) on delete cascade,
  folder_id uuid not null references public.note_folders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists note_folders_user_updated_idx
  on public.note_folders (user_id, updated_at desc);

create index if not exists note_folder_notes_folder_idx
  on public.note_folder_notes (folder_id);

alter table public.note_folders enable row level security;
alter table public.note_folder_notes enable row level security;

drop policy if exists "note_folders_select_own" on public.note_folders;
drop policy if exists "note_folders_insert_own" on public.note_folders;
drop policy if exists "note_folders_update_own" on public.note_folders;
drop policy if exists "note_folders_delete_own" on public.note_folders;

create policy "note_folders_select_own" on public.note_folders
  for select to authenticated
  using (auth.uid() = user_id);

create policy "note_folders_insert_own" on public.note_folders
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "note_folders_update_own" on public.note_folders
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "note_folders_delete_own" on public.note_folders
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "note_folder_notes_select_own" on public.note_folder_notes;
drop policy if exists "note_folder_notes_insert_own" on public.note_folder_notes;
drop policy if exists "note_folder_notes_update_own" on public.note_folder_notes;
drop policy if exists "note_folder_notes_delete_own" on public.note_folder_notes;

create policy "note_folder_notes_select_own" on public.note_folder_notes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "note_folder_notes_insert_own" on public.note_folder_notes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
    and exists (
      select 1 from public.note_folders f
      where f.id = folder_id and f.user_id = auth.uid()
    )
  );

create policy "note_folder_notes_update_own" on public.note_folder_notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
    and exists (
      select 1 from public.note_folders f
      where f.id = folder_id and f.user_id = auth.uid()
    )
  );

create policy "note_folder_notes_delete_own" on public.note_folder_notes
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.note_folders to authenticated;
grant select, insert, update, delete on public.note_folder_notes to authenticated;

create or replace function public.note_folders_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists note_folders_updated_at on public.note_folders;
create trigger note_folders_updated_at
  before update on public.note_folders
  for each row
  execute function public.note_folders_set_updated_at();

create or replace function public.note_folder_notes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists note_folder_notes_updated_at on public.note_folder_notes;
create trigger note_folder_notes_updated_at
  before update on public.note_folder_notes
  for each row
  execute function public.note_folder_notes_set_updated_at();


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
  p_can_publish boolean default false,
  p_can_manage boolean default false,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_email text := lower(trim(coalesce(p_grantee_email, '')));
  v_grantee uuid;
  v_member public.note_cookie_members%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_note_id is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'note_id_and_email_required');
  end if;

  select user_id into v_owner from public.notes where id = p_note_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'note_not_found');
  end if;
  if v_owner <> auth.uid() and not public.note_cookie_can(p_note_id, 'manage') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select id into v_grantee
  from auth.users
  where lower(email) = v_email
  limit 1;

  select * into v_member
  from public.note_cookie_members
  where note_id = p_note_id
    and lower(coalesce(grantee_email, '')) = v_email
  limit 1;

  if found then
    update public.note_cookie_members
      set grantee_user_id = coalesce(v_grantee, grantee_user_id),
          grantee_email = v_email,
          can_apply = coalesce(p_can_apply, true),
          can_publish = coalesce(p_can_publish, false),
          can_manage = coalesce(p_can_manage, false),
          expires_at = p_expires_at,
          updated_at = now()
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.note_cookie_members (
      note_id,
      owner_user_id,
      grantee_user_id,
      grantee_email,
      can_apply,
      can_publish,
      can_manage,
      expires_at,
      created_by
    )
    values (
      p_note_id,
      v_owner,
      v_grantee,
      v_email,
      coalesce(p_can_apply, true),
      coalesce(p_can_publish, false),
      coalesce(p_can_manage, false),
      p_expires_at,
      auth.uid()
    )
    returning * into v_member;
  end if;

  return jsonb_build_object('ok', true, 'member', to_jsonb(v_member));
end;
$$;

create or replace function public.note_cookie_member_revoke(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.note_cookie_members%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select * into v_member from public.note_cookie_members where id = p_member_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if v_member.owner_user_id <> auth.uid() and not public.note_cookie_can(v_member.note_id, 'manage') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.note_cookie_members where id = p_member_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.note_cookie_routes_accessible()
returns table (
  id uuid,
  user_id uuid,
  note_id uuid,
  sync_id text,
  domain text,
  note_title text,
  enabled boolean,
  source_browser_id text,
  source_label text,
  source_locked_at timestamptz,
  updated_at timestamptz,
  owner_user_id uuid,
  access_role text,
  can_apply boolean,
  can_publish boolean,
  can_manage boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    r.user_id as owner_user_id,
    'owner'::text as access_role,
    true as can_apply,
    true as can_publish,
    true as can_manage
  from public.cookie_bridge_routes r
  where auth.uid() is not null
    and r.user_id = auth.uid()
    and r.enabled is true

  union all

  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    m.owner_user_id,
    'member'::text as access_role,
    m.can_apply,
    m.can_publish,
    m.can_manage
  from public.note_cookie_members m
  join public.cookie_bridge_routes r
    on r.note_id = m.note_id
   and r.user_id = m.owner_user_id
   and r.enabled is true
  where auth.uid() is not null
    and public.note_cookie_member_matches(m)
    and m.can_apply is true;
$$;

create or replace function public.note_cookie_route_join(
  p_note_id uuid,
  p_domain text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_route record;
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_note_id is null then
    return jsonb_build_object('ok', false, 'error', 'note_id_required');
  end if;
  if not public.note_cookie_can(p_note_id, 'apply') then
    return jsonb_build_object('ok', false, 'error', 'forbidden_or_not_shared');
  end if;

  select *
    into v_route
  from public.note_cookie_routes_accessible() r
  where r.note_id = p_note_id
    and (v_domain is null or r.domain = v_domain)
  order by r.updated_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'route_not_found');
  end if;

  return jsonb_build_object('ok', true, 'route', to_jsonb(v_route));
end;
$$;

create or replace function public.note_cookie_vault_summaries_accessible()
returns table (
  note_id uuid,
  domain text,
  cookie_count int,
  updated_at timestamptz,
  source_browser text,
  updated_by text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.note_id,
    v.domain,
    v.cookie_count,
    v.updated_at,
    v.source_browser,
    v.updated_by
  from public.note_cookie_vault v
  where auth.uid() is not null
    and public.note_cookie_can(v.note_id, 'apply');
$$;

create or replace function public.note_vault_fetch_v3(
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
  if not public.note_cookie_can(p_note_id, 'apply') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

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

create or replace function public.note_vault_upsert_v3(
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
begin
  if not public.note_cookie_can(p_note_id, 'publish') then
    return jsonb_build_object('ok', false, 'promoted', false, 'reason', 'forbidden');
  end if;

  return public.note_vault_upsert_v2(
    p_note_id,
    p_domain,
    p_pass,
    p_ciphertext,
    p_iv,
    p_cookie_count,
    p_source_browser,
    p_updated_by,
    p_has_facebook_login,
    p_key_names
  );
end;
$$;

revoke all on function public.note_cookie_member_matches(public.note_cookie_members) from public;
revoke all on function public.note_cookie_can(uuid, text) from public;
revoke all on function public.note_cookie_member_list(uuid) from public;
revoke all on function public.note_cookie_member_upsert(uuid, text, boolean, boolean, boolean, timestamptz) from public;
revoke all on function public.note_cookie_member_revoke(uuid) from public;
revoke all on function public.note_cookie_routes_accessible() from public;
revoke all on function public.note_cookie_route_join(uuid, text) from public;
revoke all on function public.note_cookie_vault_summaries_accessible() from public;
revoke all on function public.note_vault_fetch_v3(uuid, text, text) from public;
revoke all on function public.note_vault_upsert_v3(uuid, text, text, text, text, int, text, text, boolean, text[]) from public;

grant execute on function public.note_cookie_member_list(uuid) to authenticated;
grant execute on function public.note_cookie_member_upsert(uuid, text, boolean, boolean, boolean, timestamptz) to authenticated;
grant execute on function public.note_cookie_member_revoke(uuid) to authenticated;
grant execute on function public.note_cookie_routes_accessible() to authenticated;
grant execute on function public.note_cookie_route_join(uuid, text) to authenticated;
grant execute on function public.note_cookie_vault_summaries_accessible() to authenticated;
grant execute on function public.note_vault_fetch_v3(uuid, text, text) to authenticated;
grant execute on function public.note_vault_upsert_v3(uuid, text, text, text, text, int, text, text, boolean, text[]) to authenticated;

notify pgrst, 'reload schema';


-- 20260528170000_workspace_user_directory.sql
-- User Management directory sourced from auth.users.
-- The UI should not infer emails, created dates, or sign-in activity from local samples.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  role text not null default 'employee',
  default_project_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  last_sign_in_at timestamptz
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'employee';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists updated_at timestamptz;
alter table public.profiles add column if not exists last_sign_in_at timestamptz;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_managers" on public.profiles;
create policy "profiles_select_self_or_managers"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role in ('admin', 'manager')
  )
);

drop policy if exists "profiles_upsert_self" on public.profiles;
create policy "profiles_upsert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
  )
)
with check (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
  )
);

create or replace function public.workspace_user_directory()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz,
  project_count integer,
  project_names text[],
  activity_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select coalesce(nullif(p.role::text, ''), u.raw_app_meta_data ->> 'role', 'employee')
  into v_role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_uid;

  if v_role is null then
    select nullif(p.role::text, '')
    into v_role
    from public.profiles p
    where p.id = v_uid;
  end if;

  return query
  with scoped_users as (
    select u.*
    from auth.users u
    where coalesce(v_role, 'employee') in ('admin', 'manager')
       or u.id = v_uid
  ),
  project_agg as (
    select
      pm.user_id,
      count(distinct pm.project_id)::integer as project_count,
      coalesce(
        array_agg(distinct pr.name order by pr.name) filter (where nullif(pr.name, '') is not null),
        array[]::text[]
      ) as project_names
    from public.project_members pm
    left join public.projects pr on pr.id = pm.project_id
    group by pm.user_id
  ),
  activity_agg as (
    select
      al.user_id,
      count(*)::integer as activity_count,
      max(al.created_at) as last_activity_at
    from public.activity_logs al
    group by al.user_id
  )
  select
    u.id,
    u.email::text,
    coalesce(nullif(p.full_name::text, ''), u.raw_user_meta_data ->> 'full_name', u.email, u.id::text)::text as full_name,
    case
      when coalesce(nullif(p.role::text, ''), u.raw_app_meta_data ->> 'role', 'employee') in ('admin', 'manager', 'employee')
        then coalesce(nullif(p.role::text, ''), u.raw_app_meta_data ->> 'role', 'employee')
      else 'employee'
    end::text as role,
    coalesce(nullif(p.avatar_url::text, ''), u.raw_user_meta_data ->> 'avatar_url')::text as avatar_url,
    u.created_at,
    coalesce(u.updated_at::timestamptz, p.updated_at::timestamptz)::timestamptz as updated_at,
    coalesce(u.last_sign_in_at::timestamptz, p.last_sign_in_at::timestamptz)::timestamptz as last_sign_in_at,
    case
      when u.last_sign_in_at is null and p.last_sign_in_at is null and aa.last_activity_at is null then null
      else greatest(
        coalesce(u.last_sign_in_at::timestamptz, '-infinity'::timestamptz),
        coalesce(p.last_sign_in_at::timestamptz, '-infinity'::timestamptz),
        coalesce(aa.last_activity_at, '-infinity'::timestamptz)
      )
    end::timestamptz as last_activity_at,
    coalesce(pa.project_count, 0)::integer as project_count,
    coalesce(pa.project_names, array[]::text[]) as project_names,
    coalesce(aa.activity_count, 0)::integer as activity_count
  from scoped_users u
  left join public.profiles p on p.id = u.id
  left join project_agg pa on pa.user_id = u.id
  left join activity_agg aa on aa.user_id = u.id
  order by coalesce(nullif(p.full_name::text, ''), u.email, u.id::text);
end;
$$;

grant execute on function public.workspace_user_directory() to authenticated;


-- 20260529090000_cookie_route_owner_email_realtime.sql
-- Cookie Route owner identity + realtime propagation.

create or replace function public.note_cookie_routes_accessible_v2()
returns table (
  id uuid,
  user_id uuid,
  note_id uuid,
  sync_id text,
  domain text,
  note_title text,
  enabled boolean,
  source_browser_id text,
  source_label text,
  source_locked_at timestamptz,
  updated_at timestamptz,
  owner_user_id uuid,
  owner_email text,
  access_role text,
  can_apply boolean,
  can_publish boolean,
  can_manage boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    r.user_id as owner_user_id,
    owner.email::text as owner_email,
    'owner'::text as access_role,
    true as can_apply,
    true as can_publish,
    true as can_manage
  from public.cookie_bridge_routes r
  left join auth.users owner on owner.id = r.user_id
  where auth.uid() is not null
    and r.user_id = auth.uid()
    and r.enabled is true

  union all

  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    m.owner_user_id,
    owner.email::text as owner_email,
    'member'::text as access_role,
    m.can_apply,
    m.can_publish,
    m.can_manage
  from public.note_cookie_members m
  join public.cookie_bridge_routes r
    on r.note_id = m.note_id
   and r.user_id = m.owner_user_id
   and r.enabled is true
  left join auth.users owner on owner.id = m.owner_user_id
  where auth.uid() is not null
    and public.note_cookie_member_matches(m)
    and m.can_apply is true;
$$;

revoke all on function public.note_cookie_routes_accessible_v2() from public;
grant execute on function public.note_cookie_routes_accessible_v2() to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notes;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.cookie_bridge_routes;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.note_cookie_vault;
    exception when duplicate_object then null;
    end;
  end if;
end $$;


-- 20260529103000_note_cookie_members_realtime.sql
-- Publish note_cookie_members changes so shared users refresh accessible routes immediately.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.note_cookie_members;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

