import { supabase } from "../../lib/supabase";
import { isMissingSyncPassRpc } from "./notesSelect";

/** Set or clear note sync pass (bcrypt hash in DB). */
export async function setNoteSyncPass(
  noteId: string,
  pass: string | null,
): Promise<{ ok: true } | { ok: false; needsMigration: true }> {
  const { error } = await supabase.rpc("note_set_sync_pass", {
    p_note_id: noteId,
    p_pass: pass?.trim() || null,
  });
  if (!error) return { ok: true };
  if (isMissingSyncPassRpc(error.message)) {
    return { ok: false, needsMigration: true };
  }
  throw new Error(error.message || "Failed to set sync pass");
}
