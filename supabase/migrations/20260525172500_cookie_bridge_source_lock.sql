-- Cookie bridge source lock.
-- Only the selected source browser may publish/promote a login vault for a route.

alter table public.cookie_bridge_routes
  add column if not exists source_browser_id text,
  add column if not exists source_label text,
  add column if not exists source_locked_at timestamptz;

create index if not exists cookie_bridge_routes_source_idx
  on public.cookie_bridge_routes (user_id, source_browser_id)
  where source_browser_id is not null;

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
  v_source_browser text := nullif(trim(p_source_browser), '');
  v_locked_source text;
  v_route_count int := 0;
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

  select source_browser_id
    into v_locked_source
  from public.cookie_bridge_routes
  where user_id = v_user_id
    and note_id = p_note_id
    and domain = v_domain
    and enabled is true
  limit 1;

  get diagnostics v_route_count = row_count;

  if v_is_facebook and (v_route_count = 0 or v_locked_source is null) then
    return jsonb_build_object(
      'ok', false,
      'promoted', false,
      'reason', 'source_browser_unset',
      'attempted_source_browser', v_source_browser,
      'cookie_count', coalesce(p_cookie_count, 0)
    );
  end if;

  if v_locked_source is not null and coalesce(v_source_browser, '') <> v_locked_source then
    return jsonb_build_object(
      'ok', false,
      'promoted', false,
      'reason', 'source_browser_locked',
      'source_browser_id', v_locked_source,
      'attempted_source_browser', v_source_browser,
      'cookie_count', coalesce(p_cookie_count, 0)
    );
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
    v_source_browser,
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
    v_source_browser,
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

revoke all on function public.note_vault_upsert_v2(uuid, text, text, text, text, int, text, text, boolean, text[]) from public;
grant execute on function public.note_vault_upsert_v2(uuid, text, text, text, text, int, text, text, boolean, text[]) to anon, authenticated;

notify pgrst, 'reload schema';
