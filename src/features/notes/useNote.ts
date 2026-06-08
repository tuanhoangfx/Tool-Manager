import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { useNotesRealtimeUiRefresh } from "./notes-realtime-pref";
import { fetchNoteById, isMissingSyncIdColumn, updateNoteRow, updateNoteSyncId } from "./notesRepository";
import { setNoteSyncPass } from "./noteSyncPass";
import { generateSyncId, noteEditorContentEqual, slugifyTitle } from "./noteUtils";
import { generateShareToken, hashSharePassword } from "./shareUtils";
import type { NoteRow } from "./types";
import { getOfflineMode } from "../../lib/offlineMode";
import { readNoteDetailStale, writeNoteDetailCache } from "../../lib/note-detail-cache";
import { getOfflineNote, upsertOfflineNote } from "./offlineNotesRepository";

export type NoteSaveResult = NoteRow & { passMigrationHint?: string };

export type NoteDraft = {
  title: string;
  slug: string;
  /** Omit to keep existing note.domain (domain lives on Cookie Auto binding). */
  domain?: string;
  body_md: string;
  pinned: boolean;
  share_enabled: boolean;
  share_can_edit?: boolean;
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
      share_can_edit: patch.share_can_edit,
      share_token: patch.share_token,
    };
    res = await run(minimal);
  }

  return res;
}

export type NoteRefreshOpts = { /** Skip full editor loading — background / same-note refresh */ silent?: boolean };

function staleNoteForId(noteId: string | null): NoteRow | null {
  return noteId ? readNoteDetailStale(noteId) : null;
}

export function useNote(session: Session | null, noteId: string | null) {
  const userId = session?.user?.id ?? null;
  const realtimePref = useNotesRealtimeUiRefresh();
  const [note, setNote] = useState<NoteRow | null>(() => staleNoteForId(noteId));
  const [loading, setLoading] = useState(() => Boolean(noteId && !staleNoteForId(noteId)));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const trackedNoteId = useRef(noteId);
  const fetchGen = useRef(0);

  /** Sync note state in the same commit as selectedId — avoids one frame of the previous note. */
  if (noteId !== trackedNoteId.current) {
    trackedNoteId.current = noteId;
    fetchGen.current += 1;
    const stale = staleNoteForId(noteId);
    setNote(stale);
    setLoading(Boolean(noteId && !stale));
    setError("");
  }

  const commitNote = useCallback((row: NoteRow | null) => {
    if (!row) {
      setNote(null);
      return;
    }
    setNote((prev) => (prev && noteEditorContentEqual(prev, row) ? prev : row));
  }, []);

  const refresh = useCallback(
    async (refreshOpts?: NoteRefreshOpts) => {
      const silent = refreshOpts?.silent ?? false;
      const targetId = noteId;
      if (!userId || !targetId) {
        setNote(null);
        setLoading(false);
        return;
      }
      const gen = fetchGen.current;

      if (getOfflineMode()) {
        if (!silent) setLoading(true);
        setError("");
        try {
          const row = await getOfflineNote(targetId);
          if (gen !== fetchGen.current || targetId !== noteId) return;
          commitNote(row);
          if (row) writeNoteDetailCache(targetId, row);
          if (!row) setError("Note not found");
        } catch (err) {
          if (gen !== fetchGen.current) return;
          setError(err instanceof Error ? err.message : "Anonymous note load failed");
          setNote(null);
        } finally {
          if (!silent) setLoading(false);
        }
        return;
      }

      if (!silent) setLoading(true);
      setError("");
      const { data, error: err } = await fetchNoteById(targetId);
      if (gen !== fetchGen.current || targetId !== noteId) return;

      if (err) {
        setError(err.message);
        setNote(null);
      } else {
        let row = (data as NoteRow | null) ?? null;
        if (row && !row.sync_id?.trim()) {
          const sync_id = generateSyncId();
          const { data: patched, error: patchErr } = await updateNoteSyncId(targetId, sync_id);
          if (gen !== fetchGen.current || targetId !== noteId) return;
          if (!patchErr && patched) row = patched as NoteRow;
          else if (patchErr && isMissingSyncIdColumn(patchErr.message)) {
            /* sync_id column not migrated */
          }
        }
        commitNote(row);
        if (row) writeNoteDetailCache(targetId, row);
      }
      setLoading(false);
    },
    [commitNote, noteId, userId],
  );

  useEffect(() => {
    if (!userId || !noteId) {
      setNote(null);
      setLoading(false);
      return;
    }
    void refresh({ silent: true });
  }, [noteId, refresh, userId]);

  const refreshFromRealtime = useCallback(() => {
    void refresh({ silent: true });
  }, [refresh]);
  useNotesCookieRealtime(session, refreshFromRealtime, realtimePref);

  const save = useCallback(
    async (draft: NoteDraft) => {
      if (!userId || !noteId) throw new Error("No note selected");
      if (getOfflineMode()) {
        setSaving(true);
        const now = new Date().toISOString();
        const existing = note ?? (await getOfflineNote(noteId));
        if (!existing) {
          setSaving(false);
          throw new Error("Note not found");
        }
        const row: NoteRow = {
          ...existing,
          title: draft.title.trim() || "Untitled",
          slug: draft.slug.trim() || slugifyTitle(draft.title, existing.slug || "note"),
          domain: draft.domain !== undefined ? draft.domain.trim() : existing.domain,
          body_md: draft.body_md,
          pinned: draft.pinned,
          share_enabled: false,
          share_can_edit: false,
          share_token: null,
          share_password_hash: null,
          sync_status: "manual",
          updated_at: now,
        };
        await upsertOfflineNote(row);
        setNote(row);
        setSaving(false);
        return row;
      }
      setSaving(true);
      const slug = draft.slug.trim() || slugifyTitle(draft.title, note?.slug || "note");

      let share_token = note?.share_token ?? null;
      let share_password_hash = note?.share_password_hash ?? null;

      const shareCanEdit = Boolean(draft.share_enabled && draft.share_can_edit);

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
        share_can_edit: shareCanEdit,
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
      writeNoteDetailCache(noteId, row);
      return out;
    },
    [userId, noteId, note?.share_token, note?.share_password_hash, note?.slug],
  );

  return { note, loading, error, saving, refresh, save };
}
