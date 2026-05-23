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
