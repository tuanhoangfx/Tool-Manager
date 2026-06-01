import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { createNoteRow, deleteNoteRow, fetchNotesList } from "./notesRepository";
import { generateSyncId, toListItem } from "./noteUtils";
import type { NoteRow } from "./types";
import { getOfflineMode } from "../../lib/offlineMode";
import { deleteOfflineNote, listOfflineNotes, upsertOfflineNote } from "./offlineNotesRepository";

export type NotesRefreshOpts = { /** Skip loading UI — use for realtime / background poll */ silent?: boolean };

export function useNotes(session: Session | null, opts?: { realtime?: boolean }) {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async (refreshOpts?: NotesRefreshOpts) => {
    const silent = refreshOpts?.silent ?? false;
    if (!session) {
      setRows([]);
      return;
    }
    if (getOfflineMode()) {
      if (!silent) setLoading(true);
      setError("");
      try {
        setRows(await listOfflineNotes());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Offline notes load failed");
        setRows([]);
      } finally {
        if (!silent) setLoading(false);
      }
      return;
    }
    if (!silent) setLoading(true);
    setError("");
    try {
      const { data, error: err } = await fetchNotesList();
      if (err) {
        setError(err.message);
        setRows([]);
      } else {
        setRows((data ?? []) as NoteRow[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const realtimeEnabled = opts?.realtime ?? loadCookieBridgePrefs().realtimeSync;
  const refreshFromRealtime = useCallback(() => {
    void refresh({ silent: true });
  }, [refresh]);
  useNotesCookieRealtime(session, refreshFromRealtime, realtimeEnabled && !getOfflineMode());

  const notes = useMemo(() => rows.map(toListItem), [rows]);

  const createNote = useCallback(async () => {
    if (!session) throw new Error("Not signed in");
    if (getOfflineMode()) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const row: NoteRow = {
        id,
        user_id: session.user.id,
        title: "New note",
        slug: `note-${Date.now()}`,
        domain: "",
        body_md: "",
        cookie_snapshot: null,
        pinned: false,
        share_enabled: false,
        share_token: null,
        share_password_hash: null,
        share_expires_at: null,
        share_view_count: 0,
        sync_status: "manual",
        synced_at: null,
        sync_id: generateSyncId(),
        sync_pass_hash: null,
        created_at: now,
        updated_at: now,
      };
      await upsertOfflineNote(row);
      await refresh();
      return row;
    }
    const slug = `note-${Date.now()}`;
    const { data, error: err } = await createNoteRow({
      userId: session.user.id,
      title: "New note",
      slug,
      syncId: generateSyncId(),
    });
    if (err) throw err;
    await refresh();
    return data as NoteRow;
  }, [session, refresh]);

  const deleteNote = useCallback(
    async (id: string) => {
      if (getOfflineMode()) {
        await deleteOfflineNote(id);
        await refresh();
        return;
      }
      const { error: err } = await deleteNoteRow(id);
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  return {
    notes,
    loading,
    error,
    refresh,
    createNote,
    deleteNote,
  };
}
