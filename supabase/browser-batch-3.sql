
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

