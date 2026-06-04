-- Per-user last Load (vault → browser) per note + domain. No agent heartbeat.

create table if not exists public.cookie_route_user_activity (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  domain text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  last_load_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (note_id, domain, user_id)
);

create index if not exists cookie_route_user_activity_note_domain_idx
  on public.cookie_route_user_activity (note_id, domain);

alter table public.cookie_route_user_activity enable row level security;

drop policy if exists "cookie_route_user_activity_select" on public.cookie_route_user_activity;
create policy "cookie_route_user_activity_select" on public.cookie_route_user_activity
  for select to authenticated
  using (
    public.note_cookie_can(note_id, 'apply')
    or exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
    or public.note_cookie_can(note_id, 'manage')
  );

grant select on public.cookie_route_user_activity to authenticated;

create or replace function public.normalize_cookie_route_domain(p_domain text)
returns text
language sql
immutable
as $$
  select case
    when nullif(trim(coalesce(p_domain, '')), '') is null then null
    else
      '.' || lower(
        regexp_replace(
          regexp_replace(trim(p_domain), '^\.+', ''),
          '^www\.',
          ''
        )
      )
  end;
$$;

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

  return jsonb_build_object(
    'ok', true,
    'activity', jsonb_build_object(
      'user_id', v_row.user_id,
      'last_load_at', v_row.last_load_at
    )
  );
end;
$$;

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

  if v_owner <> auth.uid() and not public.note_cookie_can(p_note_id, 'manage') then
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
        'last_load_at', a.last_load_at
      )
      order by a.last_load_at desc nulls last
    ),
    '[]'::jsonb
  )
  into v_rows
  from public.cookie_route_user_activity a
  where a.note_id = p_note_id
    and a.domain = v_domain;

  return jsonb_build_object('ok', true, 'activities', v_rows);
end;
$$;

revoke all on function public.normalize_cookie_route_domain(text) from public;
revoke all on function public.cookie_route_record_load(uuid, text) from public;
revoke all on function public.cookie_route_activity_list(uuid, text) from public;

grant execute on function public.normalize_cookie_route_domain(text) to authenticated;
grant execute on function public.cookie_route_record_load(uuid, text) to authenticated;
grant execute on function public.cookie_route_activity_list(uuid, text) to authenticated;

notify pgrst, 'reload schema';
