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

  select id into v_grantee
  from auth.users
  where lower(email) = v_email
  limit 1;

  select * into v_member
  from public.note_cookie_members
  where note_id = p_note_id
    and lower(coalesce(grantee_email, '')) = v_email
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

create or replace function public.note_cookie_member_revoke(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.note_cookie_members%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  select * into v_member from public.note_cookie_members where id = p_member_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'member_not_found');
  end if;
  if v_member.owner_user_id <> auth.uid() and not public.note_cookie_can(v_member.note_id, 'manage') then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  delete from public.note_cookie_members where id = p_member_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.note_cookie_routes_accessible()
returns table (
  id uuid,
  user_id uuid,
  note_id uuid,
  sync_id text,
  domain text,
  note_title text,
  enabled boolean,
  source_browser_id text,
  source_label text,
  source_locked_at timestamptz,
  updated_at timestamptz,
  owner_user_id uuid,
  access_role text,
  can_apply boolean,
  can_publish boolean,
  can_manage boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    r.user_id as owner_user_id,
    'owner'::text as access_role,
    true as can_apply,
    true as can_publish,
    true as can_manage
  from public.cookie_bridge_routes r
  where auth.uid() is not null
    and r.user_id = auth.uid()
    and r.enabled is true

  union all

  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    m.owner_user_id,
    'member'::text as access_role,
    m.can_apply,
    m.can_publish,
    m.can_manage
  from public.note_cookie_members m
  join public.cookie_bridge_routes r
    on r.note_id = m.note_id
   and r.user_id = m.owner_user_id
   and r.enabled is true
  where auth.uid() is not null
    and public.note_cookie_member_matches(m)
    and m.can_apply is true;
$$;

create or replace function public.note_cookie_route_join(
  p_note_id uuid,
  p_domain text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_route record;
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if p_note_id is null then
    return jsonb_build_object('ok', false, 'error', 'note_id_required');
  end if;
  if not public.note_cookie_can(p_note_id, 'apply') then
    return jsonb_build_object('ok', false, 'error', 'forbidden_or_not_shared');
  end if;

  select *
    into v_route
  from public.note_cookie_routes_accessible() r
  where r.note_id = p_note_id
    and (v_domain is null or r.domain = v_domain)
  order by r.updated_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'route_not_found');
  end if;

  return jsonb_build_object('ok', true, 'route', to_jsonb(v_route));
end;
$$;

create or replace function public.note_cookie_vault_summaries_accessible()
returns table (
  note_id uuid,
  domain text,
  cookie_count int,
  updated_at timestamptz,
  source_browser text,
  updated_by text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.note_id,
    v.domain,
    v.cookie_count,
    v.updated_at,
    v.source_browser,
    v.updated_by
  from public.note_cookie_vault v
  where auth.uid() is not null
    and public.note_cookie_can(v.note_id, 'apply');
$$;

create or replace function public.note_vault_fetch_v3(
  p_note_id uuid,
  p_domain text,
  p_pass text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.note_cookie_vault%rowtype;
begin
  if not public.note_cookie_can(p_note_id, 'apply') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_row
  from public.note_cookie_vault
  where note_id = p_note_id
    and domain = trim(p_domain);

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'ciphertext', v_row.ciphertext,
    'iv', v_row.iv,
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

create or replace function public.note_vault_upsert_v3(
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
begin
  if not public.note_cookie_can(p_note_id, 'publish') then
    return jsonb_build_object('ok', false, 'promoted', false, 'reason', 'forbidden');
  end if;

  return public.note_vault_upsert_v2(
    p_note_id,
    p_domain,
    p_pass,
    p_ciphertext,
    p_iv,
    p_cookie_count,
    p_source_browser,
    p_updated_by,
    p_has_facebook_login,
    p_key_names
  );
end;
$$;

revoke all on function public.note_cookie_member_matches(public.note_cookie_members) from public;
revoke all on function public.note_cookie_can(uuid, text) from public;
revoke all on function public.note_cookie_member_list(uuid) from public;
revoke all on function public.note_cookie_member_upsert(uuid, text, boolean, boolean, boolean, timestamptz) from public;
revoke all on function public.note_cookie_member_revoke(uuid) from public;
revoke all on function public.note_cookie_routes_accessible() from public;
revoke all on function public.note_cookie_route_join(uuid, text) from public;
revoke all on function public.note_cookie_vault_summaries_accessible() from public;
revoke all on function public.note_vault_fetch_v3(uuid, text, text) from public;
revoke all on function public.note_vault_upsert_v3(uuid, text, text, text, text, int, text, text, boolean, text[]) from public;

grant execute on function public.note_cookie_member_list(uuid) to authenticated;
grant execute on function public.note_cookie_member_upsert(uuid, text, boolean, boolean, boolean, timestamptz) to authenticated;
grant execute on function public.note_cookie_member_revoke(uuid) to authenticated;
grant execute on function public.note_cookie_routes_accessible() to authenticated;
grant execute on function public.note_cookie_route_join(uuid, text) to authenticated;
grant execute on function public.note_cookie_vault_summaries_accessible() to authenticated;
grant execute on function public.note_vault_fetch_v3(uuid, text, text) to authenticated;
grant execute on function public.note_vault_upsert_v3(uuid, text, text, text, text, int, text, text, boolean, text[]) to authenticated;

notify pgrst, 'reload schema';


-- 20260528170000_workspace_user_directory.sql
-- User Management directory sourced from auth.users.
-- The UI should not infer emails, created dates, or sign-in activity from local samples.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  role text not null default 'employee',
  default_project_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  last_sign_in_at timestamptz
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'employee';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists updated_at timestamptz;
alter table public.profiles add column if not exists last_sign_in_at timestamptz;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_managers" on public.profiles;
create policy "profiles_select_self_or_managers"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role in ('admin', 'manager')
  )
);

drop policy if exists "profiles_upsert_self" on public.profiles;
create policy "profiles_upsert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
  )
)
with check (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.role = 'admin'
  )
);

create or replace function public.workspace_user_directory()
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz,
  last_activity_at timestamptz,
  project_count integer,
  project_names text[],
  activity_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select coalesce(nullif(p.role::text, ''), u.raw_app_meta_data ->> 'role', 'employee')
  into v_role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_uid;

  if v_role is null then
    select nullif(p.role::text, '')
    into v_role
    from public.profiles p
    where p.id = v_uid;
  end if;

  return query
  with scoped_users as (
    select u.*
    from auth.users u
    where coalesce(v_role, 'employee') in ('admin', 'manager')
       or u.id = v_uid
  ),
  project_agg as (
    select
      pm.user_id,
      count(distinct pm.project_id)::integer as project_count,
      coalesce(
        array_agg(distinct pr.name order by pr.name) filter (where nullif(pr.name, '') is not null),
        array[]::text[]
      ) as project_names
    from public.project_members pm
    left join public.projects pr on pr.id = pm.project_id
    group by pm.user_id
  ),
  activity_agg as (
    select
      al.user_id,
      count(*)::integer as activity_count,
      max(al.created_at) as last_activity_at
    from public.activity_logs al
    group by al.user_id
  )
  select
    u.id,
    u.email::text,
    coalesce(nullif(p.full_name::text, ''), u.raw_user_meta_data ->> 'full_name', u.email, u.id::text)::text as full_name,
    case
      when coalesce(nullif(p.role::text, ''), u.raw_app_meta_data ->> 'role', 'employee') in ('admin', 'manager', 'employee')
        then coalesce(nullif(p.role::text, ''), u.raw_app_meta_data ->> 'role', 'employee')
      else 'employee'
    end::text as role,
    coalesce(nullif(p.avatar_url::text, ''), u.raw_user_meta_data ->> 'avatar_url')::text as avatar_url,
    u.created_at,
    coalesce(u.updated_at::timestamptz, p.updated_at::timestamptz)::timestamptz as updated_at,
    coalesce(u.last_sign_in_at::timestamptz, p.last_sign_in_at::timestamptz)::timestamptz as last_sign_in_at,
    case
      when u.last_sign_in_at is null and p.last_sign_in_at is null and aa.last_activity_at is null then null
      else greatest(
        coalesce(u.last_sign_in_at::timestamptz, '-infinity'::timestamptz),
        coalesce(p.last_sign_in_at::timestamptz, '-infinity'::timestamptz),
        coalesce(aa.last_activity_at, '-infinity'::timestamptz)
      )
    end::timestamptz as last_activity_at,
    coalesce(pa.project_count, 0)::integer as project_count,
    coalesce(pa.project_names, array[]::text[]) as project_names,
    coalesce(aa.activity_count, 0)::integer as activity_count
  from scoped_users u
  left join public.profiles p on p.id = u.id
  left join project_agg pa on pa.user_id = u.id
  left join activity_agg aa on aa.user_id = u.id
  order by coalesce(nullif(p.full_name::text, ''), u.email, u.id::text);
end;
$$;

grant execute on function public.workspace_user_directory() to authenticated;


-- 20260529090000_cookie_route_owner_email_realtime.sql
-- Cookie Route owner identity + realtime propagation.

create or replace function public.note_cookie_routes_accessible_v2()
returns table (
  id uuid,
  user_id uuid,
  note_id uuid,
  sync_id text,
  domain text,
  note_title text,
  enabled boolean,
  source_browser_id text,
  source_label text,
  source_locked_at timestamptz,
  updated_at timestamptz,
  owner_user_id uuid,
  owner_email text,
  access_role text,
  can_apply boolean,
  can_publish boolean,
  can_manage boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    r.user_id as owner_user_id,
    owner.email::text as owner_email,
    'owner'::text as access_role,
    true as can_apply,
    true as can_publish,
    true as can_manage
  from public.cookie_bridge_routes r
  left join auth.users owner on owner.id = r.user_id
  where auth.uid() is not null
    and r.user_id = auth.uid()
    and r.enabled is true

  union all

  select
    r.id,
    r.user_id,
    r.note_id,
    r.sync_id,
    r.domain,
    r.note_title,
    r.enabled,
    r.source_browser_id,
    r.source_label,
    r.source_locked_at,
    r.updated_at,
    m.owner_user_id,
    owner.email::text as owner_email,
    'member'::text as access_role,
    m.can_apply,
    m.can_publish,
    m.can_manage
  from public.note_cookie_members m
  join public.cookie_bridge_routes r
    on r.note_id = m.note_id
   and r.user_id = m.owner_user_id
   and r.enabled is true
  left join auth.users owner on owner.id = m.owner_user_id
  where auth.uid() is not null
    and public.note_cookie_member_matches(m)
    and m.can_apply is true;
$$;

revoke all on function public.note_cookie_routes_accessible_v2() from public;
grant execute on function public.note_cookie_routes_accessible_v2() to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.notes;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.cookie_bridge_routes;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.note_cookie_vault;
    exception when duplicate_object then null;
    end;
  end if;
end $$;


-- 20260529103000_note_cookie_members_realtime.sql
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

