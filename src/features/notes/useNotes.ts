import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { createNoteRow, deleteNoteRow, fetchNotesList } from "./notesRepository";
import { generateSyncId, toListItem } from "./noteUtils";
import type { NoteRow } from "./types";

export function useNotes(session: Session | null, opts?: { realtime?: boolean }) {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session) {
      setRows([]);
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
  useNotesCookieRealtime(session, refresh, realtimeEnabled);

  const notes = useMemo(() => rows.map(toListItem), [rows]);

  const createNote = useCallback(async () => {
    if (!session) throw new Error("Not signed in");
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
