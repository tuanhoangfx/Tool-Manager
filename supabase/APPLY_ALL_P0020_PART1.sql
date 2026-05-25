create extension if not exists pgcrypto;

alter table public.notes
  add column if not exists sync_id text,
  add column if not exists sync_pass_hash text;

create unique index if not exists notes_sync_id_idx on public.notes (sync_id) where sync_id is not null;

update public.notes
set sync_id = 'TM-' || substr(replace(id::text, '-', ''), 1, 8)
where sync_id is null or trim(sync_id) = '';

create or replace function public.note_verify_sync_pass(p_note_id uuid, p_pass text)
returns table (user_id uuid, note_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass_hash text;
  v_uid uuid;
  v_nid uuid;
begin
  select n.sync_pass_hash, n.user_id, n.id
  into v_pass_hash, v_uid, v_nid
  from public.notes n
  where n.id = p_note_id;

  if v_nid is null then
    raise exception 'note not found';
  end if;

  if v_pass_hash is not null and v_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_pass_hash) <> v_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  return query select v_uid, v_nid;
end;
$$;

revoke all on function public.note_verify_sync_pass(uuid, text) from public;
grant execute on function public.note_verify_sync_pass(uuid, text) to anon, authenticated;

create or replace function public.note_sync_cookies_by_note_id(
  p_note_id uuid,
  p_pass text default null,
  p_snapshot jsonb default '[]'::jsonb,
  p_domain text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass_hash text;
begin
  select n.sync_pass_hash into v_pass_hash from public.notes n where n.id = p_note_id;
  if not found then
    raise exception 'note not found';
  end if;
  if v_pass_hash is not null and v_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_pass_hash) <> v_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;
  update public.notes
  set
    cookie_snapshot = coalesce(p_snapshot, '[]'::jsonb),
    sync_status = case when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced' else 'pending' end,
    synced_at = now(),
    domain = coalesce(nullif(trim(p_domain), ''), domain)
  where id = p_note_id;
  return jsonb_build_object('id', p_note_id, 'ok', true);
end;
$$;

revoke all on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) from public;
grant execute on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) to anon, authenticated;

create or replace function public.note_set_sync_pass(p_note_id uuid, p_pass text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.notes
  set sync_pass_hash = case
    when p_pass is null or trim(p_pass) = '' then null
    else crypt(trim(p_pass), gen_salt('bf'))
  end
  where id = p_note_id and user_id = auth.uid();
  if not found then
    raise exception 'note not found';
  end if;
end;
$$;

revoke all on function public.note_set_sync_pass(uuid, text) from public;
grant execute on function public.note_set_sync_pass(uuid, text) to authenticated;
