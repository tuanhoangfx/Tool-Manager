-- P0020 account vault — change log audit trail (jsonb array)

alter table public.twofa_accounts
  add column if not exists log jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
