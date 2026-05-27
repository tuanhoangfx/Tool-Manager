import { supabase } from "../../lib/supabase";
import type { NoteRow } from "./types";

export const NOTES_LIST_SELECT =
  "id,user_id,title,slug,domain,cookie_snapshot,pinned,share_enabled,share_token,share_password_hash,share_expires_at,share_view_count,sync_status,synced_at,sync_id,sync_pass_hash,created_at,updated_at";

export const NOTES_DETAIL_SELECT = `${NOTES_LIST_SELECT},body_md`;

export const NOTES_LEGACY_SELECT =
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
    "Tool/P0020-Data-Box/supabase/APPLY_COOKIE_SYNC.sql then refresh."
  );
}

function withSyncDefaults(row: Record<string, unknown>, bodyMd = ""): NoteRow {
  return {
    ...row,
    body_md: (row.body_md as string | undefined) ?? bodyMd,
    sync_id: (row.sync_id as string | null) ?? null,
    sync_pass_hash: (row.sync_pass_hash as string | null) ?? null,
  } as NoteRow;
}

export async function fetchNotesList() {
  const res = await supabase
    .from("notes")
    .select(NOTES_LIST_SELECT)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    const legacy = await supabase
      .from("notes")
      .select(NOTES_LEGACY_SELECT)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (!legacy.error && legacy.data) {
      return {
        ...legacy,
        data: legacy.data.map((r: Record<string, unknown>) => withSyncDefaults(r)),
      };
    }
    return legacy;
  }

  if (!res.error && res.data) {
    return {
      ...res,
      data: res.data.map((r: Record<string, unknown>) => withSyncDefaults(r)),
    };
  }
  return res;
}

export async function fetchNoteById(noteId: string) {
  const res = await supabase.from("notes").select(NOTES_DETAIL_SELECT).eq("id", noteId).maybeSingle();
  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    const legacy = await supabase.from("notes").select(NOTES_LEGACY_SELECT).eq("id", noteId).maybeSingle();
    if (!legacy.error && legacy.data) {
      return { ...legacy, data: withSyncDefaults(legacy.data as Record<string, unknown>) };
    }
    return legacy;
  }
  if (!res.error && res.data) return { ...res, data: withSyncDefaults(res.data as Record<string, unknown>) };
  return res;
}

export async function fetchNoteBySyncId(syncId: string) {
  const res = await supabase.from("notes").select(NOTES_DETAIL_SELECT).eq("sync_id", syncId).maybeSingle();
  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    return { data: null, error: { message: migrationHintMessage() } };
  }
  if (!res.error && res.data) {
    return { ...res, data: withSyncDefaults(res.data as Record<string, unknown>) };
  }
  return res;
}

export async function createNoteRow(input: {
  userId: string;
  title: string;
  slug: string;
  domain?: string;
  bodyMd?: string;
  syncId: string;
}) {
  return supabase
    .from("notes")
    .insert({
      user_id: input.userId,
      title: input.title,
      slug: input.slug,
      domain: input.domain ?? "",
      body_md: input.bodyMd ?? "",
      sync_id: input.syncId,
    })
    .select(NOTES_DETAIL_SELECT)
    .single();
}

export async function updateNoteRow(noteId: string, patch: Record<string, unknown>) {
  return supabase.from("notes").update(patch).eq("id", noteId).select(NOTES_DETAIL_SELECT).single();
}

export async function updateNoteSyncId(noteId: string, syncId: string) {
  return supabase.from("notes").update({ sync_id: syncId }).eq("id", noteId).select(NOTES_DETAIL_SELECT).single();
}

export async function deleteNoteRow(noteId: string) {
  return supabase.from("notes").delete().eq("id", noteId);
}
