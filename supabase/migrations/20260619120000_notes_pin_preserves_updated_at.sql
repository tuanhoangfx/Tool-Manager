-- Pin / view-count / sync-only touches must not bump note "edited" timestamp.

create or replace function public.notes_set_updated_at()
returns trigger
language plpgsql
as $$
declare
  content_changed boolean;
begin
  content_changed := (
    old.title is distinct from new.title
    or old.slug is distinct from new.slug
    or old.domain is distinct from new.domain
    or old.body_md is distinct from new.body_md
    or old.cookie_snapshot is distinct from new.cookie_snapshot
    or old.share_enabled is distinct from new.share_enabled
    or old.share_can_edit is distinct from new.share_can_edit
    or old.share_token is distinct from new.share_token
    or old.share_password_hash is distinct from new.share_password_hash
    or old.share_expires_at is distinct from new.share_expires_at
    or old.sync_id is distinct from new.sync_id
    or old.sync_pass_hash is distinct from new.sync_pass_hash
    or old.sync_status is distinct from new.sync_status
  );

  if content_changed then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;

  return new;
end;
$$;
