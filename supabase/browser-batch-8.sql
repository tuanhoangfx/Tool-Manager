
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

