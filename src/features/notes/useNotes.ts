import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { toListItem } from "./noteUtils";
import type { NoteListItem, NoteRow } from "./types";

export function useNotes(session: Session | null) {
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
    const { data, error: err } = await supabase
      .from("notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });

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

  const notes = useMemo(() => rows.map(toListItem), [rows]);

  const createNote = useCallback(async () => {
    if (!session) throw new Error("Chưa đăng nhập");
    const slug = `note-${Date.now()}`;
    const { data, error: err } = await supabase
      .from("notes")
      .insert({
        user_id: session.user.id,
        title: "Note mới",
        slug,
        domain: "",
        body_md: "",
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
