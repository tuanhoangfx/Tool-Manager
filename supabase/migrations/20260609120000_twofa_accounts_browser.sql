-- Optional browser profile code on 2FA accounts (e.g. 0100, 0101).

alter table public.twofa_accounts
  add column if not exists browser text;

create index if not exists twofa_accounts_browser_idx
  on public.twofa_accounts (user_id, browser)
  where browser is not null;
