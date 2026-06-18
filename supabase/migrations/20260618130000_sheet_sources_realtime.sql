-- Enable Realtime on sheet_sources (cross-device sheet list sync)

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.sheet_sources;
  end if;
exception
  when duplicate_object then null;
end $$;
