-- Resolve grantee_user_id when sharing by Hub User ID (primary + legacy synthetic email).

create or replace function public.note_cookie_member_upsert(
  p_note_id uuid,
  p_grantee_email text,
  p_can_apply boolean default true,
  p_can_publish boolean default false,
  p_can_manage boolean default false,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_email text := lower(trim(coalesce(p_grantee_email, '')));
  v_legacy_email text;
  v_grantee uuid;
  v_member public.note_cookie_members%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_note_id is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'note_id_and_email_required');
  end if;

  select user_id into v_owner from public.notes where id = p_note_id;
  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'note_not_found');
  end if;
  if v_owner <> auth.uid() and not public.note_cookie_can(p_note_id, 'manage') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_legacy_email := case
    when v_email like '%@infix1.io.vn' then replace(v_email, '@infix1.io.vn', '@id.hub.x1z10.local')
    when v_email like '%@id.hub.x1z10.local' then replace(v_email, '@id.hub.x1z10.local', '@infix1.io.vn')
    else null
  end;

  select id into v_grantee
  from auth.users
  where lower(email) = v_email
     or (v_legacy_email is not null and lower(email) = v_legacy_email)
  limit 1;

  select * into v_member
  from public.note_cookie_members
  where note_id = p_note_id
    and (
      lower(coalesce(grantee_email, '')) = v_email
      or (v_legacy_email is not null and lower(coalesce(grantee_email, '')) = v_legacy_email)
    )
  limit 1;

  if found then
    update public.note_cookie_members
      set grantee_user_id = coalesce(v_grantee, grantee_user_id),
          grantee_email = v_email,
          can_apply = coalesce(p_can_apply, true),
          can_publish = coalesce(p_can_publish, false),
          can_manage = coalesce(p_can_manage, false),
          expires_at = p_expires_at,
          updated_at = now()
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.note_cookie_members (
      note_id,
      owner_user_id,
      grantee_user_id,
      grantee_email,
      can_apply,
      can_publish,
      can_manage,
      expires_at,
      created_by
    )
    values (
      p_note_id,
      v_owner,
      v_grantee,
      v_email,
      coalesce(p_can_apply, true),
      coalesce(p_can_publish, false),
      coalesce(p_can_manage, false),
      p_expires_at,
      auth.uid()
    )
    returning * into v_member;
  end if;

  return jsonb_build_object('ok', true, 'member', to_jsonb(v_member));
end;
$$;
