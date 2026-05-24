-- Notes sync: ID + pass (extension auth per note)

alter table public.notes
  add column if not exists sync_id text,
  add column if not exists sync_pass_hash text;

create unique index if not exists notes_sync_id_idx on public.notes (sync_id) where sync_id is not null;

-- Backfill sync_id for existing rows
update public.notes
set sync_id = 'TM-' || substr(replace(id::text, '-', ''), 1, 8)
where sync_id is null or sync_id = '';
