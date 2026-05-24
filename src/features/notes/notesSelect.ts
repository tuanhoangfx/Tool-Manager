import { supabase } from "../../lib/supabase";
import type { NoteRow } from "./types";

export const NOTES_SELECT_LEGACY =
  "id,user_id,title,slug,domain,body_md,cookie_snapshot,pinned,share_enabled,share_token,share_password_hash,share_expires_at,share_view_count,sync_status,synced_at,created_at,updated_at";

export function isMissingSyncIdColumn(message: string): boolean {
  return /sync_id/i.test(message) && /does not exist|column/i.test(message);
}

export function isMissingSyncPassRpc(message: string): boolean {
  return /note_set_sync_pass/i.test(message) && /does not exist|42883|PGRST202/i.test(message);
}

export function migrationHintMessage(): string {
  return (
    "Database missing notes.sync_id — open Supabase SQL Editor and run file " +
    "docs/SUPABASE-P0020.md — run migrations / generate:apply-all, then refresh."
  );
}

function withSyncDefaults(row: Record<string, unknown>): NoteRow {
  return {
    ...row,
    sync_id: (row.sync_id as string | null) ?? null,
    sync_pass_hash: (row.sync_pass_hash as string | null) ?? null,
  } as NoteRow;
}

export async function fetchAllNotes() {
  let res = await supabase
    .from("notes")
    .select("*")
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    res = await supabase
      .from("notes")
      .select(NOTES_SELECT_LEGACY)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (!res.error && res.data) {
      return {
        ...res,
        data: res.data.map((r: Record<string, unknown>) => withSyncDefaults(r)),
      };
    }
  }
  return res;
}

export async function fetchNoteById(noteId: string) {
  let res = await supabase.from("notes").select("*").eq("id", noteId).maybeSingle();
  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    res = await supabase.from("notes").select(NOTES_SELECT_LEGACY).eq("id", noteId).maybeSingle();
    if (!res.error && res.data) {
      return { ...res, data: withSyncDefaults(res.data as Record<string, unknown>) };
    }
  }
  return res;
}

export async function fetchNoteBySyncId(syncId: string) {
  let res = await supabase.from("notes").select("*").eq("sync_id", syncId).maybeSingle();
  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    return { data: null, error: { message: migrationHintMessage() } };
  }
  return res;
}
