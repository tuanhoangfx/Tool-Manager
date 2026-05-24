import { generateSyncId } from "../notes/noteUtils";
import {
  fetchNoteById,
  fetchNoteBySyncId,
  isMissingSyncIdColumn,
  migrationHintMessage,
} from "../notes/notesSelect";
import { supabase } from "../../lib/supabase";

export type ResolvedNote = {
  id: string;
  sync_id: string | null;
  title: string;
  sync_pass_hash?: string | null;
  /** Use note_sync_cookies_by_note_id RPC when sync_id column/RPC unavailable */
  useNoteIdRpc?: boolean;
};

/** Lookup note by UUID or Sync ID (RLS: own notes only). */
export async function resolveNoteForBinding(opts: {
  noteId?: string;
  syncId?: string;
}): Promise<{ note: ResolvedNote | null; error?: string }> {
  const noteId = opts.noteId?.trim();
  const syncId = opts.syncId?.trim();

  if (!noteId && !syncId) {
    return { note: null, error: "Enter Note ID (UUID) or Sync ID." };
  }

  if (noteId) {
    const { data, error } = await fetchNoteById(noteId);
    if (error) {
      if (isMissingSyncIdColumn(error.message)) {
        return { note: null, error: migrationHintMessage() };
      }
      return { note: null, error: error.message };
    }
    if (!data) {
      return {
        note: null,
        error: `No note with ID ${noteId.slice(0, 8)}… — wrong UUID or another account?`,
      };
    }

    let row = data;
    if (!row.sync_id?.trim()) {
      const newSyncId = generateSyncId();
      const { data: patched, error: patchErr } = await supabase
        .from("notes")
        .update({ sync_id: newSyncId })
        .eq("id", noteId)
        .select("id, sync_id, title")
        .maybeSingle();

      if (patchErr) {
        if (isMissingSyncIdColumn(patchErr.message)) {
          return {
            note: {
              id: row.id,
              sync_id: null,
              title: row.title,
              sync_pass_hash: row.sync_pass_hash,
              useNoteIdRpc: true,
            },
          };
        }
        return { note: null, error: `Note found but could not assign Sync ID: ${patchErr.message}` };
      }
      if (patched) row = { ...row, sync_id: patched.sync_id, title: patched.title ?? row.title };
    }

    return {
      note: {
        id: row.id,
        sync_id: row.sync_id,
        title: row.title,
        sync_pass_hash: row.sync_pass_hash,
        useNoteIdRpc: !row.sync_id?.trim(),
      },
    };
  }

  const { data, error } = await fetchNoteBySyncId(syncId!);
  if (error) return { note: null, error: error.message };
  if (!data) return { note: null, error: `No note with Sync ID ${syncId}.` };

  return {
    note: {
      id: data.id,
      sync_id: data.sync_id,
      title: data.title,
      sync_pass_hash: data.sync_pass_hash,
      useNoteIdRpc: !data.sync_id?.trim(),
    },
  };
}
