-- Tombstone soft-delete: delta sync propagates deletes via updated_at without full reconcile.

alter table public.twofa_accounts
  add column if not exists deleted_at timestamptz;

create index if not exists twofa_accounts_user_tombstone_updated_idx
  on public.twofa_accounts (user_id, updated_at desc, id desc)
  where deleted_at is not null;

drop index if exists public.twofa_accounts_identity_uidx;

create unique index twofa_accounts_identity_uidx
  on public.twofa_accounts (user_id, service, account, coalesce(browser, ''))
  where deleted_at is null;

notify pgrst, 'reload schema';
