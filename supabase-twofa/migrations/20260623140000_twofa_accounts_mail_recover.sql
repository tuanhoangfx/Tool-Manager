-- P0020 2FA vault — recovery mailbox (sheet Mail column)

alter table public.twofa_accounts
  add column if not exists mail_recover text;

create index if not exists twofa_accounts_mail_recover_idx
  on public.twofa_accounts (user_id, mail_recover);

notify pgrst, 'reload schema';
