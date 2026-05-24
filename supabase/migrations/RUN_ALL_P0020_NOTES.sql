-- =============================================================================
-- P0020 Workspace Notes — run once in Supabase Dashboard → SQL Editor
-- Fixes: "column notes.sync_id does not exist" and cookie sync RPC
-- =============================================================================

-- 1) Base table (skip if you already have public.notes)
\i 20260523120000_tool_manager_notes.sql

-- Paste contents of each file below in order, OR run via Supabase CLI:
--   supabase db push

-- 2) Share columns
-- 20260523140000_notes_share_public.sql

-- 3) Sync ID + pass (REQUIRED for Cookie bridge)
alter table public.notes
  add column if not exists sync_id text,
  add column if not exists sync_pass_hash text;

create unique index if not exists notes_sync_id_idx on public.notes (sync_id) where sync_id is not null;

update public.notes
set sync_id = 'TM-' || substr(replace(id::text, '-', ''), 1, 8)
where sync_id is null or sync_id = '';

-- 4) RPC note_sync_cookies + note_set_sync_pass
-- (see 20260523160000_note_sync_cookies_rpc.sql)

-- 5) RPC by Note UUID
-- (see 20260524120000_note_sync_cookies_by_note_id.sql)

-- 6) Realtime
-- (see 20260524100000_notes_realtime.sql)
