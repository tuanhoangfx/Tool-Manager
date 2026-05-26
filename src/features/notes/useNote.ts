import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { fetchNoteById, isMissingSyncIdColumn, updateNoteRow, updateNoteSyncId } from "./notesRepository";
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

function isMissingColumnError(message: string): boolean {
  return /column/i.test(message) && /does not exist|not found|schema cache/i.test(message);
}

function isUniqueSlugError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return e.code === "23505" || /notes_user_slug_idx|duplicate key/i.test(e.message ?? "");
}

async function updateNoteWithFallback(noteId: string, patch: Record<string, unknown>) {
  const run = (nextPatch: Record<string, unknown>) => updateNoteRow(noteId, nextPatch);

  let res = await run(patch);
  if (!res.error) return res;

  const msg = res.error.message ?? "";
  if (isUniqueSlugError(res.error)) {
    res = await run({ ...patch, slug: `note-${noteId.slice(0, 8)}` });
    if (!res.error) return res;
  }

  if (isMissingColumnError(msg)) {
    const minimal = {
      title: patch.title,
      slug: patch.slug,
      domain: patch.domain,
      body_md: patch.body_md,
      pinned: patch.pinned,
      share_enabled: patch.share_enabled,
      share_token: patch.share_token,
    };
    res = await run(minimal);
  }

  return res;
}

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
        const { data: patched, error: patchErr } = await updateNoteSyncId(noteId, sync_id);
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
      const slug = draft.slug.trim() || slugifyTitle(draft.title, note?.slug || "note");

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

      const { data, error: err } = await updateNoteWithFallback(noteId, patch);
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
    [session, noteId, note?.share_token, note?.share_password_hash, note?.slug],
  );

  return { note, loading, error, saving, refresh, save };
}
