-- =============================================================================
-- GENERATED — do not edit by hand
-- Source: supabase/migrations/*.sql (sorted by timestamp)
-- Regenerate: pnpm generate:apply-all
-- Dashboard: paste this file in Supabase SQL Editor → Run
-- CLI alternative: supabase db push
-- Generated at: 2026-05-24T23:50:26.398Z
-- Files: 20260523120000_tool_manager_notes.sql, 20260523140000_notes_share_public.sql, 20260523150000_notes_sync_id_pass.sql, 20260523160000_note_sync_cookies_rpc.sql, 20260524100000_notes_realtime.sql, 20260524120000_note_sync_cookies_by_note_id.sql, 20260525100000_note_cookie_vault_v4.sql, 20260526100000_note_cookie_vault_updated_by.sql
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------- 20260523120000_tool_manager_notes.sql ----------

-- Tool Manager (P0020) — notes table + RLS
-- Apply: Supabase Dashboard → SQL Editor → Run this file

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  slug text not null default '',
  domain text not null default '',
  body_md text not null default '',
  cookie_snapshot jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  share_enabled boolean not null default false,
  share_token text,
  sync_status text not null default 'manual'
    check (sync_status in ('manual', 'synced', 'pending', 'error')),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notes_user_slug_idx on public.notes (user_id, slug);
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_select_own" on public.notes;
drop policy if exists "notes_insert_own" on public.notes;
drop policy if exists "notes_update_own" on public.notes;
drop policy if exists "notes_delete_own" on public.notes;

create policy "notes_select_own" on public.notes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "notes_insert_own" on public.notes
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "notes_update_own" on public.notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notes_delete_own" on public.notes
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.notes to authenticated;

create or replace function public.notes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row
  execute function public.notes_set_updated_at();

-- ---------- 20260523140000_notes_share_public.sql ----------

-- Sprint 3: public share + password hash

alter table public.notes
  add column if not exists share_password_hash text,
  add column if not exists share_expires_at timestamptz,
  add column if not exists share_view_count int not null default 0;

drop policy if exists "notes_share_public" on public.notes;

create policy "notes_share_public" on public.notes
  for select to anon
  using (
    share_enabled = true
    and share_token is not null
    and (share_expires_at is null or share_expires_at > now())
  );

grant select on public.notes to anon;

-- ---------- 20260523150000_notes_sync_id_pass.sql ----------

-- Notes sync: ID + pass (extension auth per note)

alter table public.notes
  add column if not exists sync_id text,
  add column if not exists sync_pass_hash text;

create unique index if not exists notes_sync_id_idx on public.notes (sync_id) where sync_id is not null;

-- Backfill sync_id for existing rows
update public.notes
set sync_id = 'TM-' || substr(replace(id::text, '-', ''), 1, 8)
where sync_id is null or sync_id = '';

-- ---------- 20260523160000_note_sync_cookies_rpc.sql ----------

-- RPC: extension pushes cookie snapshot via sync_id + optional pass (no user JWT)

create extension if not exists pgcrypto;

create or replace function public.note_sync_cookies(
  p_sync_id text,
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
  v_note public.notes%rowtype;
begin
  if p_sync_id is null or trim(p_sync_id) = '' then
    raise exception 'sync_id required';
  end if;

  select * into v_note from public.notes where sync_id = trim(p_sync_id);
  if not found then
    raise exception 'note not found';
  end if;

  if v_note.sync_pass_hash is not null and v_note.sync_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_note.sync_pass_hash) <> v_note.sync_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  update public.notes
  set
    cookie_snapshot = coalesce(p_snapshot, '[]'::jsonb),
    sync_status = case when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced' else 'pending' end,
    synced_at = now(),
    domain = coalesce(nullif(trim(p_domain), ''), domain)
  where id = v_note.id;

  return jsonb_build_object('id', v_note.id, 'sync_id', v_note.sync_id, 'ok', true);
end;
$$;

revoke all on function public.note_sync_cookies(text, text, jsonb, text) from public;
grant execute on function public.note_sync_cookies(text, text, jsonb, text) to anon, authenticated;

-- Helper: hash pass when user sets sync pass on note (from authenticated client)
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

-- Auto sync_id on insert
create or replace function public.notes_assign_sync_id()
returns trigger
language plpgsql
as $$
begin
  if new.sync_id is null or trim(new.sync_id) = '' then
    new.sync_id := 'TM-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;
  return new;
end;
$$;

drop trigger if exists notes_assign_sync_id on public.notes;
create trigger notes_assign_sync_id
  before insert on public.notes
  for each row
  execute function public.notes_assign_sync_id();

-- ---------- 20260524100000_notes_realtime.sql ----------

-- Enable Realtime on notes (cookie_snapshot / sync_status updates from extension RPC)

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notes;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ---------- 20260524120000_note_sync_cookies_by_note_id.sql ----------

-- RPC: extension pushes cookies by Note UUID (when sync_id column missing or preferred)

create extension if not exists pgcrypto;

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
  v_note public.notes%rowtype;
begin
  if p_note_id is null then
    raise exception 'note_id required';
  end if;

  select * into v_note from public.notes where id = p_note_id;
  if not found then
    raise exception 'note not found';
  end if;

  if v_note.sync_pass_hash is not null and v_note.sync_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_note.sync_pass_hash) <> v_note.sync_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;

  update public.notes
  set
    cookie_snapshot = coalesce(p_snapshot, '[]'::jsonb),
    sync_status = case when jsonb_array_length(coalesce(p_snapshot, '[]'::jsonb)) > 0 then 'synced' else 'pending' end,
    synced_at = now(),
    domain = coalesce(nullif(trim(p_domain), ''), domain)
  where id = v_note.id;

  return jsonb_build_object('id', v_note.id, 'ok', true);
end;
$$;

revoke all on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) from public;
grant execute on function public.note_sync_cookies_by_note_id(uuid, text, jsonb, text) to anon, authenticated;

-- ---------- 20260525100000_note_cookie_vault_v4.sql ----------

-- V4: Encrypted cookie vault (AES-GCM ciphertext) + RPC for extension cross-browser apply

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

create index if not exists note_cookie_vault_user_updated_idx
  on public.note_cookie_vault (user_id, updated_at desc);

alter table public.note_cookie_vault enable row level security;

drop policy if exists "vault_select_own" on public.note_cookie_vault;
drop policy if exists "vault_insert_own" on public.note_cookie_vault;
drop policy if exists "vault_update_own" on public.note_cookie_vault;
drop policy if exists "vault_delete_own" on public.note_cookie_vault;

create policy "vault_select_own" on public.note_cookie_vault
  for select to authenticated
  using (user_id = auth.uid());

create policy "vault_insert_own" on public.note_cookie_vault
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "vault_update_own" on public.note_cookie_vault
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "vault_delete_own" on public.note_cookie_vault
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.note_cookie_vault to authenticated;

-- Verify sync pass (same rules as note_sync_cookies)
create or replace function public.note_verify_sync_pass(p_note_id uuid, p_pass text)
returns public.notes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
begin
  select * into v_note from public.notes where id = p_note_id;
  if not found then
    raise exception 'note not found';
  end if;
  if v_note.sync_pass_hash is not null and v_note.sync_pass_hash <> '' then
    if p_pass is null or crypt(p_pass, v_note.sync_pass_hash) <> v_note.sync_pass_hash then
      raise exception 'invalid pass';
    end if;
  end if;
  return v_note;
end;
$$;

-- Extension upserts encrypted vault (anon + pass)
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
  v_note public.notes;
  v_row public.note_cookie_vault%rowtype;
begin
  if p_note_id is null or trim(p_domain) = '' then
    raise exception 'note_id and domain required';
  end if;
  if p_ciphertext is null or p_iv is null then
    raise exception 'ciphertext and iv required';
  end if;

  v_note := note_verify_sync_pass(p_note_id, p_pass);

  insert into public.note_cookie_vault (
    note_id, user_id, domain, ciphertext, iv, cookie_count, source_browser, updated_at
  )
  values (
    p_note_id,
    v_note.user_id,
    trim(p_domain),
    p_ciphertext,
    p_iv,
    coalesce(p_cookie_count, 0),
    nullif(trim(p_source_browser), ''),
    now()
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
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'cookie_count', v_row.cookie_count,
    'updated_at', v_row.updated_at,
    'ok', true
  );
end;
$$;

revoke all on function public.note_vault_upsert(uuid, text, text, text, text, int, text) from public;
grant execute on function public.note_vault_upsert(uuid, text, text, text, text, int, text) to anon, authenticated;

-- Extension fetches vault for decrypt + apply on other browser
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
  perform note_verify_sync_pass(p_note_id, p_pass);

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

-- Poll: vaults updated after timestamp (JWT — owner only)
create or replace function public.note_vault_poll(
  p_note_ids uuid[],
  p_since timestamptz default null
)
returns setof public.note_cookie_vault
language sql
security definer
set search_path = public
as $$
  select v.*
  from public.note_cookie_vault v
  inner join public.notes n on n.id = v.note_id
  where n.user_id = auth.uid()
    and v.note_id = any (p_note_ids)
    and (p_since is null or v.updated_at > p_since);
$$;

revoke all on function public.note_vault_poll(uuid[], timestamptz) from public;
grant execute on function public.note_vault_poll(uuid[], timestamptz) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.note_cookie_vault;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ---------- 20260526100000_note_cookie_vault_updated_by.sql ----------

-- Vault updated_by column + RPC signature (extension v0.5.17+)

alter table public.note_cookie_vault
  add column if not exists updated_by text;

drop function if exists public.note_vault_upsert(uuid, text, text, text, text, int, text, text);

create or replace function public.note_vault_upsert(
  p_note_id uuid,
  p_domain text,
  p_pass text default null,
  p_ciphertext text default null,
  p_iv text default null,
  p_cookie_count int default 0,
  p_source_browser text default null,
  p_updated_by text default null
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
  select user_id into v_uid from public.note_verify_sync_pass(p_note_id, p_pass);
  insert into public.note_cookie_vault (
    note_id, user_id, domain, ciphertext, iv, cookie_count, source_browser, updated_by, updated_at
  )
  values (
    p_note_id, v_uid, trim(p_domain), p_ciphertext, p_iv,
    coalesce(p_cookie_count, 0), nullif(trim(p_source_browser), ''), nullif(trim(p_updated_by), ''), now()
  )
  on conflict (note_id, domain) do update set
    ciphertext = excluded.ciphertext,
    iv = excluded.iv,
    cookie_count = excluded.cookie_count,
    source_browser = excluded.source_browser,
    updated_by = excluded.updated_by,
    updated_at = now();
  select * into v_row from public.note_cookie_vault where note_id = p_note_id and domain = trim(p_domain);
  return jsonb_build_object(
    'ok', true,
    'note_id', v_row.note_id,
    'domain', v_row.domain,
    'cookie_count', v_row.cookie_count,
    'source_browser', v_row.source_browser,
    'updated_by', v_row.updated_by,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.note_vault_upsert(uuid, text, text, text, text, int, text, text) from public;
grant execute on function public.note_vault_upsert(uuid, text, text, text, text, int, text, text) to anon, authenticated;

drop function if exists public.note_vault_fetch(uuid, text, text);

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
    'updated_by', v_row.updated_by,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.note_vault_fetch(uuid, text, text) from public;
grant execute on function public.note_vault_fetch(uuid, text, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ---------- reload PostgREST schema ----------
notify pgrst, 'reload schema';
