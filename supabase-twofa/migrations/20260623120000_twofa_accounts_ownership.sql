-- P0020 2FA vault — ownership column (sheet Ownership labels)

alter table public.twofa_accounts
  add column if not exists ownership text not null default 'undefined';

create index if not exists twofa_accounts_ownership_idx
  on public.twofa_accounts (user_id, ownership);

notify pgrst, 'reload schema';
