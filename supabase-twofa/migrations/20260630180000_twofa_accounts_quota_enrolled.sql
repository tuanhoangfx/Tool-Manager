-- Quota tab only lists explicitly enrolled rows (Cockpit sync / manual / stealth test).
alter table public.twofa_accounts
  add column if not exists quota_enrolled_at timestamptz;

create index if not exists idx_twofa_accounts_quota_enrolled
  on public.twofa_accounts (user_id, quota_enrolled_at desc)
  where deleted_at is null and quota_enrolled_at is not null;
