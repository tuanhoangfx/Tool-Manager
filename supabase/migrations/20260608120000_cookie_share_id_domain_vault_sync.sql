-- Cookie share: normalize Hub User ID grantee emails; vault promote marks note synced.

create or replace function public.note_cookie_normalize_grantee_email(p_raw text)
returns text
language plpgsql
immutable
as $$
declare
  v text := lower(trim(coalesce(p_raw, '')));
begin
  if v = '' then
    return '';
  end if;
  if position('@' in v) > 0 then
    return v;
  end if;
  return v || '@infix1.io.vn';
end;
$$;

create or replace function public.note_cookie_member_matches(m public.note_cookie_members)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (m.expires_at is null or m.expires_at > now())
    and (
      m.grantee_user_id = auth.uid()
      or lower(coalesce(m.grantee_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or (
        lower(split_part(coalesce(m.grantee_email, ''), '@', 1))
          = lower(split_part(coalesce(auth.jwt() ->> 'email', ''), '@', 1))
        and split_part(coalesce(m.grantee_email, ''), '@', 1) <> ''
        and (
          position('@' in coalesce(m.grantee_email, '')) = 0
          or lower(coalesce(m.grantee_email, '')) like '%@infix1.io.vn'
          or lower(coalesce(m.grantee_email, '')) like '%@id.hub.x1z10.local'
        )
      )
    );
$$;

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
  v_email text := public.note_cookie_normalize_grantee_email(p_grantee_email);
  v_grantee uuid;
  v_member public.note_cookie_members%rowtype;
  v_local text := split_part(v_email, '@', 1);
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

  select id into v_grantee
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_grantee is null and v_local <> '' then
    select id into v_grantee
    from auth.users
    where lower(split_part(email, '@', 1)) = v_local
      and (
        lower(email) like '%@infix1.io.vn'
        or lower(email) like '%@id.hub.x1z10.local'
      )
    limit 1;
  end if;

  select * into v_member
  from public.note_cookie_members
  where note_id = p_note_id
    and (
      lower(coalesce(grantee_email, '')) = v_email
      or (
        split_part(coalesce(grantee_email, ''), '@', 1) = v_local
        and v_local <> ''
      )
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

-- Backfill bare User IDs (CS00761) to canonical synthetic email.
update public.note_cookie_members
set grantee_email = public.note_cookie_normalize_grantee_email(grantee_email),
    updated_at = now()
where grantee_email is not null
  and position('@' in grantee_email) = 0;

create or replace function public.note_vault_upsert_v2(
  p_note_id uuid,
  p_domain text,
  p_pass text default null,
  p_ciphertext text default null,
  p_iv text default null,
  p_cookie_count int default 0,
  p_source_browser text default null,
  p_updated_by text default null,
  p_has_facebook_login boolean default false,
  p_key_names text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_pass_hash text;
  v_row public.note_cookie_vault%rowtype;
  v_domain text := trim(p_domain);
  v_is_facebook boolean := replace(lower(trim(p_domain)), '.', '') like '%facebookcom';
  v_version_id uuid;
begin
  if p_note_id is null or coalesce(v_domain, '') = '' then
    raise exception 'note_id and domain required';
  end if;
  if p_ciphertext is null or p_iv is null then
    raise exception 'ciphertext and iv required';
  end if;

  select user_id, sync_pass_hash
    into v_user_id, v_pass_hash
  from public.notes
  where id = p_note_id;

  if v_user_id is null then
    raise exception 'note not found';
  end if;

  if v_pass_hash is not null and v_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_pass_hash) <> v_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  insert into public.note_cookie_vault_versions (
    note_id,
    user_id,
    domain,
    ciphertext,
    iv,
    cookie_count,
    has_facebook_login,
    key_names,
    source_browser,
    updated_by
  )
  values (
    p_note_id,
    v_user_id,
    v_domain,
    p_ciphertext,
    p_iv,
    coalesce(p_cookie_count, 0),
    coalesce(p_has_facebook_login, false),
    coalesce(p_key_names, '{}'),
    nullif(trim(p_source_browser), ''),
    nullif(trim(p_updated_by), '')
  )
  returning id into v_version_id;

  if v_is_facebook and coalesce(p_has_facebook_login, false) is not true then
    return jsonb_build_object(
      'ok', true,
      'promoted', false,
      'reason', 'facebook_login_cookie_missing',
      'vault_version', v_version_id,
      'cookie_count', coalesce(p_cookie_count, 0)
    );
  end if;

  insert into public.note_cookie_vault (
    note_id,
    user_id,
    domain,
    ciphertext,
    iv,
    cookie_count,
    source_browser,
    updated_by,
    vault_version,
    has_facebook_login,
    key_names,
    updated_at
  )
  values (
    p_note_id,
    v_user_id,
    v_domain,
    p_ciphertext,
    p_iv,
    coalesce(p_cookie_count, 0),
    nullif(trim(p_source_browser), ''),
    nullif(trim(p_updated_by), ''),
    v_version_id,
    coalesce(p_has_facebook_login, false),
    coalesce(p_key_names, '{}'),
    now()
  )
  on conflict (note_id, domain) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    cookie_count = excluded.cookie_count,
    source_browser = excluded.source_browser,
    updated_by = excluded.updated_by,
    vault_version = excluded.vault_version,
    has_facebook_login = excluded.has_facebook_login,
    key_names = excluded.key_names,
    updated_at = now();

  if coalesce(p_cookie_count, 0) > 0 then
    update public.notes
    set sync_status = 'synced'
    where id = p_note_id
      and sync_status is distinct from 'synced';
  end if;

  select * into v_row
  from public.note_cookie_vault
  where note_id = p_note_id
    and domain = v_domain;

  return jsonb_build_object(
    'ok', true,
    'promoted', true,
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'cookie_count', v_row.cookie_count,
    'updated_at', v_row.updated_at,
    'updated_by', v_row.updated_by,
    'source_browser', v_row.source_browser,
    'vault_version', v_row.vault_version,
    'has_facebook_login', v_row.has_facebook_login,
    'key_names', v_row.key_names
  );
end;
$$;
