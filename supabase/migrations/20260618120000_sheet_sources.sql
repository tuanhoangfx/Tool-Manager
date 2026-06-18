-- P0020 Sheet sources: synced Google Sheet metadata per user

create table if not exists public.sheet_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  raw_url text not null,
  csv_url text not null,
  gid text not null default '0',
  dedupe_key text not null,
  title_source text not null default 'auto' check (title_source in ('auto', 'manual')),
  header_row_index int,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists sheet_sources_user_updated_idx
  on public.sheet_sources (user_id, updated_at desc);

alter table public.sheet_sources enable row level security;

drop policy if exists "sheet_sources_select_own" on public.sheet_sources;
drop policy if exists "sheet_sources_insert_own" on public.sheet_sources;
drop policy if exists "sheet_sources_update_own" on public.sheet_sources;
drop policy if exists "sheet_sources_delete_own" on public.sheet_sources;

create policy "sheet_sources_select_own" on public.sheet_sources
  for select to authenticated
  using (auth.uid() = user_id);

create policy "sheet_sources_insert_own" on public.sheet_sources
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "sheet_sources_update_own" on public.sheet_sources
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sheet_sources_delete_own" on public.sheet_sources
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.sheet_sources to authenticated;

create or replace function public.sheet_sources_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sheet_sources_updated_at on public.sheet_sources;
create trigger sheet_sources_updated_at
  before update on public.sheet_sources
  for each row
  execute function public.sheet_sources_set_updated_at();
