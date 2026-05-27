create table if not exists public.note_cookie_vault (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  ciphertext text not null,
  iv text not null,
  cookie_count int not null default 0,
  source_browser text,
  updated_at timestamptz not null default now(),
  unique (note_id, domain)
);

alter table public.note_cookie_vault enable row level security;

drop policy if exists "vault_select_own" on public.note_cookie_vault;
drop policy if exists "vault_insert_own" on public.note_cookie_vault;
drop policy if exists "vault_update_own" on public.note_cookie_vault;
drop policy if exists "vault_delete_own" on public.note_cookie_vault;

create policy "vault_select_own" on public.note_cookie_vault for select to authenticated using (user_id = auth.uid());
create policy "vault_insert_own" on public.note_cookie_vault for insert to authenticated with check (user_id = auth.uid());
create policy "vault_update_own" on public.note_cookie_vault for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "vault_delete_own" on public.note_cookie_vault for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.note_cookie_vault to authenticated;

create or replace function public.note_vault_upsert(
  p_note_id uuid,
  p_domain text,
  p_pass text default null,
  p_ciphertext text default null,
  p_iv text default null,
  p_cookie_count int default 0,
  p_source_browser text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_row public.note_cookie_vault%rowtype;
begin
  if p_note_id is null or trim(p_domain) = '' then
    raise exception 'note_id and domain required';
  end if;
  if p_ciphertext is null or p_iv is null then
    raise exception 'ciphertext and iv required';
  end if;

  select user_id into v_uid from public.note_verify_sync_pass(p_note_id, p_pass);

  insert into public.note_cookie_vault (
    note_id, user_id, domain, ciphertext, iv, cookie_count, source_browser, updated_at
  )
  values (
    p_note_id, v_uid, trim(p_domain), p_ciphertext, p_iv,
    coalesce(p_cookie_count, 0), nullif(trim(p_source_browser), ''), now()
  )
  on conflict (note_id, domain) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    cookie_count = excluded.cookie_count,
    source_browser = excluded.source_browser,
    updated_at = now();

  select * into v_row from public.note_cookie_vault
  where note_id = p_note_id and domain = trim(p_domain);

  return jsonb_build_object(
    'ok', true,
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'cookie_count', v_row.cookie_count,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.note_vault_upsert(uuid, text, text, text, text, int, text) from public;
grant execute on function public.note_vault_upsert(uuid, text, text, text, text, int, text) to anon, authenticated;

create or replace function public.note_vault_fetch(
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
  perform public.note_verify_sync_pass(p_note_id, p_pass);

  select * into v_row from public.note_cookie_vault
  where note_id = p_note_id and domain = trim(p_domain);

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
    'source_browser', v_row.source_browser,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.note_vault_fetch(uuid, text, text) from public;
grant execute on function public.note_vault_fetch(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
