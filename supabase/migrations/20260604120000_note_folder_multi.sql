-- Allow one note in multiple folders (many-to-many)

alter table public.note_folder_notes drop constraint if exists note_folder_notes_pkey;

alter table public.note_folder_notes
  add constraint note_folder_notes_pkey primary key (note_id, folder_id);

create index if not exists note_folder_notes_note_idx
  on public.note_folder_notes (note_id);
