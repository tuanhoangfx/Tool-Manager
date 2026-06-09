-- Align cloud unique key with client identity (service + account + browser code).

alter table public.twofa_accounts
  add column if not exists browser text;

create index if not exists twofa_accounts_browser_idx
  on public.twofa_accounts (user_id, browser)
  where browser is not null;

alter table public.twofa_accounts
  drop constraint if exists twofa_accounts_user_id_service_account_key;

drop index if exists public.twofa_accounts_identity_uidx;

create unique index twofa_accounts_identity_uidx
  on public.twofa_accounts (user_id, service, account, coalesce(browser, ''));

notify pgrst, 'reload schema';
