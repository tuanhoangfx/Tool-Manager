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
