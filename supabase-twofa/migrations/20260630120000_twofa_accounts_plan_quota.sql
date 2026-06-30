-- Structured subscription plan + live quota snapshot for Account Vault / Quota view.
alter table public.twofa_accounts
  add column if not exists plan_package text,
  add column if not exists plan_status text,
  add column if not exists plan_tier text,
  add column if not exists plan_expires_at timestamptz,
  add column if not exists quota_snapshot jsonb,
  add column if not exists quota_checked_at timestamptz,
  add column if not exists quota_status text;

create index if not exists idx_twofa_accounts_plan_expires
  on public.twofa_accounts (user_id, plan_expires_at)
  where deleted_at is null and plan_expires_at is not null;

create index if not exists idx_twofa_accounts_quota_checked
  on public.twofa_accounts (user_id, quota_checked_at desc)
  where deleted_at is null;
