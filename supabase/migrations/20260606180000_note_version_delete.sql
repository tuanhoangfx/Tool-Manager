-- Delete a single note version (owner only).

create or replace function public.note_version_delete(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.note_versions%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_version_id is null then
    raise exception 'version_id required';
  end if;

  select * into v_row
  from public.note_versions
  where id = p_version_id and user_id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  delete from public.note_versions
  where id = p_version_id and user_id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'deleted_id', p_version_id,
    'note_id', v_row.note_id
  );
end;
$$;

revoke all on function public.note_version_delete(uuid) from public;
grant execute on function public.note_version_delete(uuid) to authenticated;
