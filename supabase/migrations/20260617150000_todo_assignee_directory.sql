-- Todo assignee roster: all workspace users (P0020 is a default Hub tool).
-- Unlike workspace_user_directory(), employees may list every assignee.

create or replace function public.todo_assignee_directory()
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
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  return query
  with scoped_users as (
    select u.*
    from auth.users u
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

grant execute on function public.todo_assignee_directory() to authenticated;

notify pgrst, 'reload schema';
