-- Publish note_cookie_members changes so shared users refresh accessible routes immediately.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.note_cookie_members;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
