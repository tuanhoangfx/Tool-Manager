
-- 20260528120000_secure_public_share_and_retention.sql
-- Secure public note share + retention helpers.
-- Public clients call note_public_share_get instead of selecting notes directly.

create extension if not exists pgcrypto;

drop policy if exists "notes_share_public" on public.notes;
revoke select on public.notes from anon;

create or replace function public.note_public_share_get(
  p_token text,
  p_password text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.notes%rowtype;
  v_unlocked boolean := false;
begin
  if p_token is null or trim(p_token) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_token');
  end if;

  select *
    into v_note
  from public.notes
  where share_token = trim(p_token)
    and share_enabled is true
    and (share_expires_at is null or share_expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_note.share_password_hash is null or v_note.share_password_hash = '' then
    v_unlocked := true;
  elsif p_password is not null and
    encode(digest(v_note.id::text || ':' || trim(p_password), 'sha256'), 'hex') = v_note.share_password_hash then
    v_unlocked := true;
  end if;

  if not v_unlocked then
    return jsonb_build_object(
      'ok', true,
      'locked', true,
      'note', jsonb_build_object(
        'id', v_note.id,
        'title', v_note.title,
        'body_md', '',
        'cookie_snapshot', '[]'::jsonb,
        'share_enabled', v_note.share_enabled,
        'share_token', v_note.share_token,
        'requires_password', true
      )
    );
  end if;

  update public.notes
  set share_view_count = coalesce(share_view_count, 0) + 1
  where id = v_note.id;

  return jsonb_build_object(
    'ok', true,
    'locked', false,
    'note', jsonb_build_object(
      'id', v_note.id,
      'title', v_note.title,
      'body_md', v_note.body_md,
      'cookie_snapshot', v_note.cookie_snapshot,
      'share_enabled', v_note.share_enabled,
      'share_token', v_note.share_token,
      'requires_password', false
    )
  );
end;
$$;

revoke all on function public.note_public_share_get(text, text) from public;
grant execute on function public.note_public_share_get(text, text) to anon, authenticated;

create index if not exists notes_share_token_enabled_idx
  on public.notes (share_token)
  where share_enabled is true and share_token is not null;

create or replace function public.cookie_bridge_cleanup_retention(
  p_command_days integer default 14,
  p_vault_version_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commands_deleted integer := 0;
  v_versions_deleted integer := 0;
begin
  delete from public.cookie_bridge_commands
  where created_at < now() - make_interval(days => greatest(p_command_days, 1))
    and status in ('done', 'failed', 'cancelled');
  get diagnostics v_commands_deleted = row_count;

  delete from public.note_cookie_vault_versions
  where created_at < now() - make_interval(days => greatest(p_vault_version_days, 1));
  get diagnostics v_versions_deleted = row_count;

  return jsonb_build_object(
    'ok', true,
    'commands_deleted', v_commands_deleted,
    'vault_versions_deleted', v_versions_deleted
  );
end;
$$;

revoke all on function public.cookie_bridge_cleanup_retention(integer, integer) from public;
grant execute on function public.cookie_bridge_cleanup_retention(integer, integer) to authenticated;

notify pgrst, 'reload schema';

