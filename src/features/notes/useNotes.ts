import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { fetchAllNotes } from "./notesSelect";
import { generateSyncId, toListItem } from "./noteUtils";
import type { NoteListItem, NoteRow } from "./types";

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
    const { data, error: err } = await fetchAllNotes();

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
    const { data, error: err } = await supabase
      .from("notes")
      .insert({
        user_id: session.user.id,
        title: "New note",
        slug,
        domain: "",
        body_md: "",
        sync_id: generateSyncId(),
      })
      .select("*")
      .single();
    if (err) throw err;
    await refresh();
    return data as NoteRow;
  }, [session, refresh]);

  const deleteNote = useCallback(
    async (id: string) => {
      const { error: err } = await supabase.from("notes").delete().eq("id", id);
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
