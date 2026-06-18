import { ensureDataBoxAuth } from "../../lib/ensure-data-box-auth";
import { supabase } from "../../lib/supabase";
import type { NoteRow } from "./types";

const DATA_BOX_AUTH_REQUIRED =
  "Sign in on P0020 (Data Box). Tool Hub login alone does not grant notes access.";

async function requireDataBoxSession() {
  const session = await ensureDataBoxAuth();
  if (!session) throw new Error(DATA_BOX_AUTH_REQUIRED);
}

/** List/grid — omit cookie_snapshot + body_md to cut egress on refresh. */
export const NOTES_LIST_SELECT =
  "id,user_id,title,slug,domain,pinned,share_enabled,share_can_edit,share_token,share_password_hash,share_expires_at,share_view_count,sync_status,synced_at,sync_id,sync_pass_hash,created_at,updated_at";

export const NOTES_COOKIE_SELECT = "cookie_snapshot,sync_status,synced_at";

export const NOTES_DETAIL_SELECT = `${NOTES_LIST_SELECT},cookie_snapshot,body_md`;

export const NOTES_LEGACY_LIST_SELECT =
  "id,user_id,title,slug,domain,pinned,share_enabled,share_token,share_password_hash,share_expires_at,share_view_count,sync_status,synced_at,created_at,updated_at";

export const NOTES_LEGACY_DETAIL_SELECT = `${NOTES_LEGACY_LIST_SELECT},body_md,cookie_snapshot`;

/** @deprecated Use NOTES_LEGACY_LIST_SELECT / NOTES_LEGACY_DETAIL_SELECT */
export const NOTES_LEGACY_SELECT = NOTES_LEGACY_DETAIL_SELECT;

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
    cookie_snapshot: (row.cookie_snapshot as NoteRow["cookie_snapshot"] | undefined) ?? null,
    sync_id: (row.sync_id as string | null) ?? null,
    sync_pass_hash: (row.sync_pass_hash as string | null) ?? null,
  } as NoteRow;
}

export async function fetchNotesList() {
  await requireDataBoxSession();
  const res = await supabase
    .from("notes")
    .select(NOTES_LIST_SELECT)
    .order("updated_at", { ascending: false });

  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    const legacy = await supabase
      .from("notes")
      .select(NOTES_LEGACY_LIST_SELECT)
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
  await requireDataBoxSession();
  const res = await supabase.from("notes").select(NOTES_DETAIL_SELECT).eq("id", noteId).maybeSingle();
  if (res.error && isMissingSyncIdColumn(res.error.message)) {
    const legacy = await supabase.from("notes").select(NOTES_LEGACY_DETAIL_SELECT).eq("id", noteId).maybeSingle();
    if (!legacy.error && legacy.data) {
      return { ...legacy, data: withSyncDefaults(legacy.data as Record<string, unknown>) };
    }
    return legacy;
  }
  if (!res.error && res.data) return { ...res, data: withSyncDefaults(res.data as Record<string, unknown>) };
  return res;
}

export async function fetchNoteCookieSnapshot(noteId: string) {
  await requireDataBoxSession();
  const res = await supabase.from("notes").select(NOTES_COOKIE_SELECT).eq("id", noteId).maybeSingle();
  if (!res.error && res.data) return res;
  return res;
}

export async function fetchNoteBySyncId(syncId: string) {
  await requireDataBoxSession();
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
  await requireDataBoxSession();
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
  await requireDataBoxSession();
  return supabase.from("notes").update(patch).eq("id", noteId).select(NOTES_DETAIL_SELECT).single();
}

export async function updateNoteSyncId(noteId: string, syncId: string) {
  await requireDataBoxSession();
  return supabase.from("notes").update({ sync_id: syncId }).eq("id", noteId).select(NOTES_DETAIL_SELECT).single();
}

export type NoteDeleteResult = {
  bridge_routes_removed: number;
};

export function isMissingNoteDeleteRpc(message: string): boolean {
  return /note_delete/i.test(message) && /does not exist|42883|PGRST202/i.test(message);
}

export async function deleteNoteRow(noteId: string): Promise<{
  data: NoteDeleteResult | null;
  error: Error | null;
}> {
  await requireDataBoxSession();

  const rpc = await supabase.rpc("note_delete", { p_note_id: noteId });
  if (!rpc.error && rpc.data) {
    const payload = rpc.data as {
      ok?: boolean;
      error?: string;
      bridge_routes_removed?: number;
    };
    if (payload.ok) {
      return {
        data: { bridge_routes_removed: payload.bridge_routes_removed ?? 0 },
        error: null,
      };
    }
    const msg =
      payload.error === "not_found"
        ? "Note not found or delete not permitted"
        : payload.error ?? "Delete failed";
    return { data: null, error: new Error(msg) };
  }

  if (rpc.error && !isMissingNoteDeleteRpc(rpc.error.message ?? "")) {
    return { data: null, error: rpc.error };
  }

  const { data, error } = await supabase.from("notes").delete().eq("id", noteId).select("id");
  if (error) return { data: null, error };
  if (!data?.length) {
    return { data: null, error: new Error("Note not found or delete not permitted") };
  }
  return { data: { bridge_routes_removed: 0 }, error: null };
}
