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
