-- Members with route access can read route-level sync time (notes.synced_at) without notes RLS.

create or replace function public.note_cookie_synced_at_for_accessible()
returns table (
  note_id uuid,
  synced_at timestamptz,
  sync_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select r.note_id, n.synced_at, n.sync_status
  from public.cookie_bridge_routes r
  join public.notes n on n.id = r.note_id
  where auth.uid() is not null
    and r.user_id = auth.uid()
    and r.enabled is true

  union

  select r.note_id, n.synced_at, n.sync_status
  from public.note_cookie_members m
  join public.cookie_bridge_routes r
    on r.note_id = m.note_id
   and r.user_id = m.owner_user_id
   and r.enabled is true
  join public.notes n on n.id = r.note_id
  where auth.uid() is not null
    and public.note_cookie_member_matches(m)
    and m.can_apply is true;
$$;

revoke all on function public.note_cookie_synced_at_for_accessible() from public;
grant execute on function public.note_cookie_synced_at_for_accessible() to authenticated;

-- Shared members (apply) may read per-user activity on routes they can use.
create or replace function public.cookie_route_activity_list(
  p_note_id uuid,
  p_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_domain text;
  v_rows jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select user_id into v_owner from public.notes where id = p_note_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'note_not_found');
  end if;

  if v_owner <> auth.uid() and not public.note_cookie_can(p_note_id, 'apply') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_domain := public.normalize_cookie_route_domain(p_domain);
  if v_domain is null then
    return jsonb_build_object('ok', false, 'error', 'domain_required');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', a.user_id,
        'user_email', lower(trim(u.email)),
        'last_load_at', a.last_load_at,
        'last_sync_at', a.last_sync_at
      )
      order by coalesce(a.last_load_at, a.last_sync_at) desc nulls last
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.cookie_route_user_activity a
  join auth.users u on u.id = a.user_id
  where a.note_id = p_note_id
    and a.domain = v_domain;

  return jsonb_build_object('ok', true, 'activities', v_rows);
end;
$$;

notify pgrst, 'reload schema';
