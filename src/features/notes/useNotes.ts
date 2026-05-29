import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { createNoteRow, deleteNoteRow, fetchNotesList } from "./notesRepository";
import { generateSyncId, toListItem } from "./noteUtils";
import type { NoteRow } from "./types";
import { getOfflineMode } from "../../lib/offlineMode";
import { deleteOfflineNote, listOfflineNotes, upsertOfflineNote } from "./offlineNotesRepository";

export function useNotes(session: Session | null, opts?: { realtime?: boolean }) {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session) {
      setRows([]);
      return;
    }
    if (getOfflineMode()) {
      setLoading(true);
      setError("");
      try {
        setRows(await listOfflineNotes());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Offline notes load failed");
        setRows([]);
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: err } = await fetchNotesList();

    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data ?? []) as NoteRow[]);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const realtimeEnabled = opts?.realtime ?? loadCookieBridgePrefs().realtimeSync;
  useNotesCookieRealtime(session, refresh, realtimeEnabled && !getOfflineMode());

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
