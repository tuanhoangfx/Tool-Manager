-- P0020 2FA vault — dedicated Supabase project (czprofess P01 / zurfouqanjcubgneuctp)
-- Phase B: row-level data with pagination/delta from client; RLS per auth.users

create table if not exists public.twofa_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  service text not null default '',
  account text not null default '',
  password text,
  secret text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (user_id, service, account)
);

create index if not exists twofa_accounts_user_updated_idx
  on public.twofa_accounts (user_id, updated_at desc, id desc);

create index if not exists twofa_accounts_user_service_idx
  on public.twofa_accounts (user_id, service);

alter table public.twofa_accounts enable row level security;

drop policy if exists "twofa_accounts_select_own" on public.twofa_accounts;
drop policy if exists "twofa_accounts_insert_own" on public.twofa_accounts;
drop policy if exists "twofa_accounts_update_own" on public.twofa_accounts;
drop policy if exists "twofa_accounts_delete_own" on public.twofa_accounts;

create policy "twofa_accounts_select_own" on public.twofa_accounts
  for select to authenticated
  using (auth.uid() = user_id);

create policy "twofa_accounts_insert_own" on public.twofa_accounts
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "twofa_accounts_update_own" on public.twofa_accounts
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "twofa_accounts_delete_own" on public.twofa_accounts
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.twofa_accounts to authenticated;

create or replace function public.twofa_accounts_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists twofa_accounts_updated_at on public.twofa_accounts;
create trigger twofa_accounts_updated_at
  before update on public.twofa_accounts
  for each row
  execute function public.twofa_accounts_set_updated_at();

notify pgrst, 'reload schema';
