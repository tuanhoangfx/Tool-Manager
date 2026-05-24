import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { fetchNoteById, isMissingSyncIdColumn } from "./notesSelect";
import { setNoteSyncPass } from "./noteSyncPass";
import { generateSyncId, slugifyTitle } from "./noteUtils";
import { generateShareToken, hashSharePassword } from "./shareUtils";
import type { NoteRow } from "./types";

export type NoteSaveResult = NoteRow & { passMigrationHint?: string };

export type NoteDraft = {
  title: string;
  slug: string;
  /** Omit to keep existing note.domain (domain lives on Cookie Auto binding). */
  domain?: string;
  body_md: string;
  pinned: boolean;
  share_enabled: boolean;
  share_password?: string;
  /** Plain sync pass — hashed via RPC when non-empty */
  sync_pass?: string;
};

export function useNote(session: Session | null, noteId: string | null) {
  const [note, setNote] = useState<NoteRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!session || !noteId) {
      setNote(null);
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: err } = await fetchNoteById(noteId);
    if (err) {
      setError(err.message);
      setNote(null);
    } else {
      let row = (data as NoteRow | null) ?? null;
      if (row && !row.sync_id?.trim()) {
        const sync_id = generateSyncId();
        const { data: patched, error: patchErr } = await supabase
          .from("notes")
          .update({ sync_id })
          .eq("id", noteId)
          .select("*")
          .single();
        if (!patchErr && patched) row = patched as NoteRow;
        else if (patchErr && isMissingSyncIdColumn(patchErr.message)) {
          /* sync_id column not migrated — note still usable via note UUID RPC */
        }
      }
      setNote(row);
    }
    setLoading(false);
  }, [session, noteId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useNotesCookieRealtime(session, refresh, loadCookieBridgePrefs().realtimeSync);

  const save = useCallback(
    async (draft: NoteDraft) => {
      if (!session || !noteId) throw new Error("No note selected");
      setSaving(true);
      const slug = slugifyTitle(draft.title, draft.slug || "note");

      let share_token = note?.share_token ?? null;
      let share_password_hash = note?.share_password_hash ?? null;

      if (draft.share_enabled) {
        if (!share_token) share_token = generateShareToken();
        if (draft.share_password?.trim()) {
          share_password_hash = await hashSharePassword(draft.share_password, noteId);
        }
      } else {
        share_token = null;
        share_password_hash = null;
      }

      const patch: Record<string, unknown> = {
        title: draft.title.trim() || "Untitled",
        slug,
        body_md: draft.body_md,
        pinned: draft.pinned,
        share_enabled: draft.share_enabled,
        share_token,
        share_password_hash,
      };
      if (draft.domain !== undefined) {
        patch.domain = draft.domain.trim();
      }

      const { data, error: err } = await supabase
        .from("notes")
        .update(patch)
        .eq("id", noteId)
        .select("*")
        .single();
      if (err) {
        setSaving(false);
        throw err;
      }

      let row = data as NoteRow;
      let passMigrationHint: string | undefined;
      if (draft.sync_pass !== undefined && draft.sync_pass.trim()) {
        const passRes = await setNoteSyncPass(noteId, draft.sync_pass);
        if (passRes.ok) {
          const refreshed = await fetchNoteById(noteId);
          if (!refreshed.error && refreshed.data) {
            row = refreshed.data as NoteRow;
          }
        } else {
          passMigrationHint =
            "Note saved. Sync pass skipped — run migrations (docs/SUPABASE-P0020.md), or leave pass empty (sync works without pass).";
        }
      }
      setSaving(false);
      const out: NoteSaveResult = passMigrationHint ? { ...row, passMigrationHint } : row;
      setNote(row);
      return out;
    },
    [session, noteId, note?.share_token, note?.share_password_hash],
  );

  return { note, loading, error, saving, refresh, save };
}
