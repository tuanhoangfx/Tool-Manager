-- Note share levels: private | view (read-only link) | edit (link + anonymous edit via RPC).

alter table public.notes
  add column if not exists share_can_edit boolean not null default false;

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
        'share_can_edit', coalesce(v_note.share_can_edit, false),
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
      'share_can_edit', coalesce(v_note.share_can_edit, false),
      'share_token', v_note.share_token,
      'requires_password', false
    )
  );
end;
$$;

create or replace function public.note_public_share_save(
  p_token text,
  p_password text,
  p_title text,
  p_body_md text
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
    and coalesce(share_can_edit, false) is true
    and (share_expires_at is null or share_expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_editable');
  end if;

  if v_note.share_password_hash is null or v_note.share_password_hash = '' then
    v_unlocked := true;
  elsif p_password is not null and
    encode(digest(v_note.id::text || ':' || trim(p_password), 'sha256'), 'hex') = v_note.share_password_hash then
    v_unlocked := true;
  end if;

  if not v_unlocked then
    return jsonb_build_object('ok', false, 'error', 'password_required');
  end if;

  update public.notes
  set
    title = coalesce(nullif(trim(p_title), ''), title),
    body_md = coalesce(p_body_md, body_md),
    updated_at = now()
  where id = v_note.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.note_public_share_save(text, text, text, text) from public;
grant execute on function public.note_public_share_save(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
