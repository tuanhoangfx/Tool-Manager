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
