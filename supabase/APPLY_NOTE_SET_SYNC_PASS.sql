-- Run in Supabase SQL Editor if Notes save shows: note_set_sync_pass not in schema cache

create extension if not exists pgcrypto;

create or replace function public.note_set_sync_pass(p_note_id uuid, p_pass text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.notes
  set sync_pass_hash = case
    when p_pass is null or trim(p_pass) = '' then null
    else crypt(trim(p_pass), gen_salt('bf'))
  end
  where id = p_note_id and user_id = auth.uid();
  if not found then
    raise exception 'note not found';
  end if;
end;
$$;

revoke all on function public.note_set_sync_pass(uuid, text) from public;
grant execute on function public.note_set_sync_pass(uuid, text) to authenticated;

notify pgrst, 'reload schema';
