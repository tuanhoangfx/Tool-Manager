-- P0020 Notes folders: synced folder metadata + note assignment

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#818cf8',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.note_folder_notes (
  note_id uuid primary key references public.notes (id) on delete cascade,
  folder_id uuid not null references public.note_folders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists note_folders_user_updated_idx
  on public.note_folders (user_id, updated_at desc);

create index if not exists note_folder_notes_folder_idx
  on public.note_folder_notes (folder_id);

alter table public.note_folders enable row level security;
alter table public.note_folder_notes enable row level security;

drop policy if exists "note_folders_select_own" on public.note_folders;
drop policy if exists "note_folders_insert_own" on public.note_folders;
drop policy if exists "note_folders_update_own" on public.note_folders;
drop policy if exists "note_folders_delete_own" on public.note_folders;

create policy "note_folders_select_own" on public.note_folders
  for select to authenticated
  using (auth.uid() = user_id);

create policy "note_folders_insert_own" on public.note_folders
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "note_folders_update_own" on public.note_folders
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "note_folders_delete_own" on public.note_folders
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "note_folder_notes_select_own" on public.note_folder_notes;
drop policy if exists "note_folder_notes_insert_own" on public.note_folder_notes;
drop policy if exists "note_folder_notes_update_own" on public.note_folder_notes;
drop policy if exists "note_folder_notes_delete_own" on public.note_folder_notes;

create policy "note_folder_notes_select_own" on public.note_folder_notes
  for select to authenticated
  using (auth.uid() = user_id);

create policy "note_folder_notes_insert_own" on public.note_folder_notes
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
    and exists (
      select 1 from public.note_folders f
      where f.id = folder_id and f.user_id = auth.uid()
    )
  );

create policy "note_folder_notes_update_own" on public.note_folder_notes
  for update to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.notes n
      where n.id = note_id and n.user_id = auth.uid()
    )
    and exists (
      select 1 from public.note_folders f
      where f.id = folder_id and f.user_id = auth.uid()
    )
  );

create policy "note_folder_notes_delete_own" on public.note_folder_notes
  for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.note_folders to authenticated;
grant select, insert, update, delete on public.note_folder_notes to authenticated;

create or replace function public.note_folders_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists note_folders_updated_at on public.note_folders;
create trigger note_folders_updated_at
  before update on public.note_folders
  for each row
  execute function public.note_folders_set_updated_at();

create or replace function public.note_folder_notes_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists note_folder_notes_updated_at on public.note_folder_notes;
create trigger note_folder_notes_updated_at
  before update on public.note_folder_notes
  for each row
  execute function public.note_folder_notes_set_updated_at();
