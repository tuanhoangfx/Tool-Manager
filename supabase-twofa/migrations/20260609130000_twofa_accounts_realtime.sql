-- Enable Supabase Realtime for per-user 2FA vault sync (postgres_changes).

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.twofa_accounts;
  end if;
exception
  when duplicate_object then null;
end;
$$;

notify pgrst, 'reload schema';
