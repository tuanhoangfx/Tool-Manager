-- Delete a note (owner only) — cascades vault, bridge routes, versions, folders.
-- Returns how many Cookie Bridge cloud routes were removed (for UI toast).

create or replace function public.note_delete(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_note public.notes%rowtype;
  v_bridge_count int := 0;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;
  if p_note_id is null then
    raise exception 'note_id required';
  end if;

  select * into v_note
  from public.notes
  where id = p_note_id and user_id = v_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select count(*)::int into v_bridge_count
  from public.cookie_bridge_routes
  where note_id = p_note_id and user_id = v_user_id;

  delete from public.notes
  where id = p_note_id and user_id = v_user_id;

  return jsonb_build_object(
    'ok', true,
    'deleted_id', p_note_id,
    'bridge_routes_removed', v_bridge_count
  );
end;
$$;

revoke all on function public.note_delete(uuid) from public;
grant execute on function public.note_delete(uuid) to authenticated;

notify pgrst, 'reload schema';
