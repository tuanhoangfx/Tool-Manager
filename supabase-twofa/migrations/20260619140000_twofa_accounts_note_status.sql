-- P0020 account vault — note + live status (general account manager, not 2FA-only)

alter table public.twofa_accounts
  add column if not exists note text not null default '',
  add column if not exists status text not null default 'active';

update public.twofa_accounts
set status = 'active'
where status is null or btrim(status) = '';

notify pgrst, 'reload schema';
