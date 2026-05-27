-- =============================================================================
-- P0020-Data-Box — run once in Supabase Dashboard → SQL Editor
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

-- 7) Notes folders
-- (see 20260525103000_note_folders.sql)

-- 8) Cookie vault updated_by + extension v0.5.17+ RPC signature
-- (see 20260526100000_note_cookie_vault_updated_by.sql)

-- 9) Cookie bridge cloud routes
-- (see 20260525133000_cookie_bridge_routes.sql)

-- 10) Cookie bridge browser agents + command queue
-- (see 20260525165000_cookie_bridge_agents.sql)

-- 11) Versioned cookie vault sync metadata + RPC v2
-- (see 20260527113000_note_cookie_vault_versioned_sync.sql)

-- 12) Note ID cookie members + accessible route/vault RPC v3
-- (see 20260528153000_note_cookie_members.sql)

-- 13) User Management directory from auth.users
-- (see 20260528170000_workspace_user_directory.sql)

-- 14) Cookie route owner email + route/vault realtime publication
-- (see 20260529090000_cookie_route_owner_email_realtime.sql)

-- 15) Cookie member realtime publication for shared route refresh
-- (see 20260529103000_note_cookie_members_realtime.sql)
