-- Domain-normalized activity lookup + realtime for Tool route detail refresh.

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
  v_raw text := nullif(trim(coalesce(p_domain, '')), '');
  v_rows jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select user_id into v_owner from public.notes where id = p_note_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'note_not_found');
  end if;

  if v_owner <> auth.uid() and not public.note_cookie_can(p_note_id, 'manage') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_domain := public.normalize_cookie_route_domain(p_domain);
  if v_domain is null and v_raw is null then
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
    and (
      (v_domain is not null and a.domain = v_domain)
      or (v_raw is not null and a.domain = v_raw)
      or (
        v_domain is not null
        and public.normalize_cookie_route_domain(a.domain) = v_domain
      )
    );

  return jsonb_build_object('ok', true, 'activities', v_rows);
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.cookie_route_user_activity;
  end if;
exception
  when duplicate_object then null;
end;
$$;

notify pgrst, 'reload schema';
