
-- 20260528153000_note_cookie_members.sql
-- Note-level cookie sharing.
-- Note ID is the invite/add identifier; permissions live here, not in public note share.

create table if not exists public.note_cookie_members (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  grantee_user_id uuid references auth.users (id) on delete cascade,
  grantee_email text,
  can_apply boolean not null default true,
  can_publish boolean not null default false,
  can_manage boolean not null default false,
  expires_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint note_cookie_members_grantee_required
    check (grantee_user_id is not null or nullif(trim(coalesce(grantee_email, '')), '') is not null)
);

create unique index if not exists note_cookie_members_note_user_idx
  on public.note_cookie_members (note_id, grantee_user_id)
  where grantee_user_id is not null;

create unique index if not exists note_cookie_members_note_email_idx
  on public.note_cookie_members (note_id, lower(grantee_email))
  where grantee_email is not null;

create index if not exists note_cookie_members_owner_idx
  on public.note_cookie_members (owner_user_id, note_id);

create index if not exists note_cookie_members_grantee_idx
  on public.note_cookie_members (grantee_user_id, expires_at);

alter table public.note_cookie_members enable row level security;

drop policy if exists "note_cookie_members_select_allowed" on public.note_cookie_members;
drop policy if exists "note_cookie_members_insert_owner" on public.note_cookie_members;
drop policy if exists "note_cookie_members_update_owner" on public.note_cookie_members;
drop policy if exists "note_cookie_members_delete_owner" on public.note_cookie_members;

create policy "note_cookie_members_select_allowed" on public.note_cookie_members
  for select to authenticated
  using (
    owner_user_id = auth.uid()
    or grantee_user_id = auth.uid()
    or lower(coalesce(grantee_email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "note_cookie_members_insert_owner" on public.note_cookie_members
  for insert to authenticated
  with check (
    owner_user_id = auth.uid()
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
  );

create policy "note_cookie_members_update_owner" on public.note_cookie_members
  for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "note_cookie_members_delete_owner" on public.note_cookie_members
  for delete to authenticated
  using (owner_user_id = auth.uid());

grant select, insert, update, delete on public.note_cookie_members to authenticated;

create or replace function public.note_cookie_members_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists note_cookie_members_updated_at on public.note_cookie_members;
create trigger note_cookie_members_updated_at
  before update on public.note_cookie_members
  for each row
  execute function public.note_cookie_members_set_updated_at();

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
    );
$$;

create or replace function public.note_cookie_can(
  p_note_id uuid,
  p_action text default 'apply'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  if auth.uid() is null or p_note_id is null then
    return false;
  end if;

  select * into v_note from public.notes where id = p_note_id;
  if not found then
    return false;
  end if;

  if v_note.user_id = auth.uid() then
    return true;
  end if;

  return exists (
    select 1
    from public.note_cookie_members m
    where m.note_id = p_note_id
      and public.note_cookie_member_matches(m)
      and case lower(coalesce(p_action, 'apply'))
        when 'publish' then m.can_publish
        when 'manage' then m.can_manage
        else m.can_apply
      end
  );
end;
$$;

create or replace function public.note_cookie_member_list(p_note_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
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

  select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at desc), '[]'::jsonb)
    into v_rows
  from public.note_cookie_members m
  where m.note_id = p_note_id;

  return jsonb_build_object('ok', true, 'members', v_rows);
end;
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

