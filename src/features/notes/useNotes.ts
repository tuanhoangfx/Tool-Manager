import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNotesCookieRealtime } from "../cookie/useNotesCookieRealtime";
import { writeNoteDetailCache } from "../../lib/note-detail-cache";
import { readNotesListStaleCache, writeNotesListClientCache } from "../../lib/notes-list-cache";
import { createNoteRow, deleteNoteRow, fetchNotesList } from "./notesRepository";
import { useNotesRealtimeUiRefresh } from "./notes-realtime-pref";
import { readNotesListPrefs } from "./notes-list-prefs";
import { generateSyncId, mergeNoteRowForList, sortNoteRows, toListItem } from "./noteUtils";
import type { NoteRow } from "./types";
import { getOfflineMode } from "../../lib/offlineMode";
import { deleteOfflineNote, listOfflineNotes, upsertOfflineNote } from "./offlineNotesRepository";

export type NotesRefreshOpts = { /** Skip loading UI — use for realtime / background poll */ silent?: boolean };

export function useNotes(session: Session | null, opts?: { realtime?: boolean; enabled?: boolean }) {
  const enabled = opts?.enabled ?? true;
  const userId = session?.user?.id ?? null;
  const realtimePref = useNotesRealtimeUiRefresh();
  const [rows, setRows] = useState<NoteRow[]>(() => readNotesListStaleCache(userId) ?? []);
  const [loading, setLoading] = useState(() => readNotesListStaleCache(userId) == null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const refreshInFlight = useRef(false);

  const refresh = useCallback(async (refreshOpts?: NotesRefreshOpts) => {
    const silent = refreshOpts?.silent ?? false;
    if (!userId) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    if (getOfflineMode()) {
      if (!silent) setLoading(true);
      setRefreshing(false);
      setError("");
      try {
        const offlineRows = await listOfflineNotes();
        setRows(offlineRows);
        writeNotesListClientCache(userId, offlineRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Anonymous notes load failed");
        setRows([]);
      } finally {
        if (!silent) setLoading(false);
        refreshInFlight.current = false;
      }
      return;
    }

    const cached = readNotesListStaleCache(userId);
    const hasStale = (cached?.length ?? 0) > 0;
    if (!silent) {
      if (hasStale) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
    }
    setError("");
    try {
      const { data, error: err } = await fetchNotesList();
      if (err) {
        setError(err.message);
        if (!hasStale) setRows([]);
      } else {
        const next = sortNoteRows((data ?? []) as NoteRow[], readNotesListPrefs().sort);
        setRows(next);
        writeNotesListClientCache(userId, next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
      if (!hasStale) setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      refreshInFlight.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const stale = readNotesListStaleCache(userId);
    setRows(stale ?? []);
    if (!enabled) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    void refresh({ silent: stale != null && stale.length > 0 });
  }, [userId, refresh, enabled]);

  const realtimeEnabled = enabled && (opts?.realtime ?? realtimePref);
  const refreshFromRealtime = useCallback(() => {
    void refresh({ silent: true });
  }, [refresh]);
  useNotesCookieRealtime(session, refreshFromRealtime, realtimeEnabled && !getOfflineMode());

  const notes = useMemo(() => rows.map(toListItem), [rows]);

  const upsertListRow = useCallback(
    (row: NoteRow) => {
      if (!userId) return;
      setRows((prev) => {
        const next = sortNoteRows(
          [row, ...prev.filter((r) => r.id !== row.id)],
          readNotesListPrefs().sort,
        );
        writeNotesListClientCache(userId, next);
        return next;
      });
    },
    [userId],
  );

  const mergeNoteInList = useCallback(
    (saved: NoteRow) => {
      if (!userId) return;
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx < 0) return prev;
        const next = [...prev];
        next[idx] = mergeNoteRowForList(prev[idx], saved);
        const sorted = sortNoteRows(next, readNotesListPrefs().sort);
        writeNotesListClientCache(userId, sorted);
        return sorted;
      });
    },
    [userId],
  );

  const createNote = useCallback(async () => {
    if (!session?.user?.id) throw new Error("Not signed in");
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
        share_can_edit: false,
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
      upsertListRow(row);
      writeNoteDetailCache(row.id, row);
      void refresh({ silent: true });
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
    const row = data as NoteRow;
    upsertListRow(row);
    writeNoteDetailCache(row.id, row);
    void refresh({ silent: true });
    return row;
  }, [session, refresh, upsertListRow]);

  const deleteNote = useCallback(
    async (id: string) => {
      if (getOfflineMode()) {
        await deleteOfflineNote(id);
        await refresh({ silent: true });
        return;
      }
      const { error: err } = await deleteNoteRow(id);
      if (err) throw err;
      await refresh({ silent: true });
    },
    [refresh],
  );

  return {
    notes,
    loading,
    refreshing,
    error,
    refresh,
    mergeNoteInList,
    createNote,
    deleteNote,
  };
}
