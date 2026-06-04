-- Sync must not set last_load_at (was NOT NULL DEFAULT now() on insert).

alter table public.cookie_route_user_activity
  alter column last_load_at drop default;

alter table public.cookie_route_user_activity
  alter column last_load_at drop not null;

-- Remove phantom load timestamps created by sync-only inserts.
update public.cookie_route_user_activity
set last_load_at = null
where last_sync_at is not null
  and last_load_at is not null
  and last_load_at = last_sync_at;

create or replace function public.cookie_route_record_load(
  p_note_id uuid,
  p_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_row public.cookie_route_user_activity%rowtype;
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_note_id is null then
    return jsonb_build_object('ok', false, 'error', 'note_required');
  end if;

  v_domain := public.normalize_cookie_route_domain(p_domain);
  if v_domain is null then
    return jsonb_build_object('ok', false, 'error', 'domain_required');
  end if;

  if not public.note_cookie_can(p_note_id, 'apply') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.cookie_route_user_activity (note_id, domain, user_id, last_load_at, updated_at)
  values (p_note_id, v_domain, auth.uid(), now(), now())
  on conflict (note_id, domain, user_id)
  do update set
    last_load_at = excluded.last_load_at,
    updated_at = now()
  returning * into v_row;

  if v_email <> '' then
    update public.note_cookie_members m
    set grantee_user_id = auth.uid(),
        updated_at = now()
    where m.note_id = p_note_id
      and m.grantee_user_id is null
      and lower(trim(coalesce(m.grantee_email, ''))) = v_email;
  end if;

  return jsonb_build_object(
    'ok', true,
    'activity', jsonb_build_object(
      'user_id', v_row.user_id,
      'last_load_at', v_row.last_load_at
    )
  );
end;
$$;

create or replace function public.cookie_route_record_sync(
  p_note_id uuid,
  p_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text;
  v_row public.cookie_route_user_activity%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_note_id is null then
    return jsonb_build_object('ok', false, 'error', 'note_required');
  end if;

  v_domain := public.normalize_cookie_route_domain(p_domain);
  if v_domain is null then
    return jsonb_build_object('ok', false, 'error', 'domain_required');
  end if;

  if not public.note_cookie_can(p_note_id, 'publish') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.cookie_route_user_activity (note_id, domain, user_id, last_sync_at, last_load_at, updated_at)
  values (p_note_id, v_domain, auth.uid(), now(), null, now())
  on conflict (note_id, domain, user_id)
  do update set
    last_sync_at = excluded.last_sync_at,
    updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'activity', jsonb_build_object(
      'user_id', v_row.user_id,
      'last_sync_at', v_row.last_sync_at
    )
  );
end;
$$;

notify pgrst, 'reload schema';
