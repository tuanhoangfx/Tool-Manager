import { useCallback, useEffect, useState } from "react";
import { getOfflineMode } from "../../lib/offlineMode";
import {
  createNoteVersionIfChanged,
  deleteNoteVersion,
  listNoteVersions,
  restoreNoteVersion,
} from "./noteVersionsRepository";
import { prefetchAllNoteVersionsFromList } from "./noteVersionDetailCache";
import { readNotesVersionIntervalMinutes } from "./notes-version-prefs";
import type { NoteVersionListItem, NoteVersionSource } from "./noteVersionUtils";

type Options = {
  /** Load version list for History modal + toolbar badge count. */
  active?: boolean;
};

export function useNoteVersions(noteId: string | null, options: Options | boolean = {}) {
  const active = typeof options === "boolean" ? options : (options.active ?? false);
  const [versions, setVersions] = useState<NoteVersionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!noteId || getOfflineMode()) {
      setVersions([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const rows = await listNoteVersions(noteId);
      prefetchAllNoteVersionsFromList(rows);
      setVersions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load history");
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [noteId]);

  useEffect(() => {
    if (!active || !noteId) {
      if (!active) setVersions([]);
      return;
    }
    void refresh();
  }, [active, noteId, refresh]);

  const snapshot = useCallback(
    async (source: NoteVersionSource, targetNoteId?: string, label?: string) => {
      const id = targetNoteId ?? noteId;
      if (!id || getOfflineMode()) return { ok: true, created: false };
      const res = await createNoteVersionIfChanged(id, source, {
        label,
        minIntervalMinutes: source === "interval" ? readNotesVersionIntervalMinutes() : undefined,
      });
      if (id === noteId && active) await refresh();
      return res;
    },
    [active, noteId, refresh],
  );

  const checkpoint = useCallback(
    async (label?: string) => {
      if (!noteId || getOfflineMode()) throw new Error("History unavailable in anonymous mode");
      return snapshot("manual", noteId, label);
    },
    [noteId, snapshot],
  );

  const sessionSnapshot = useCallback(
    (targetNoteId: string) => snapshot("session", targetNoteId),
    [snapshot],
  );

  const saveSnapshot = useCallback(() => snapshot("save"), [snapshot]);

  const intervalSnapshot = useCallback(() => snapshot("interval"), [snapshot]);

  const restore = useCallback(
    async (versionId: string) => {
      setRestoring(true);
      setError("");
      try {
        const res = await restoreNoteVersion(versionId);
        if (!res.ok) throw new Error(res.error ?? "Restore failed");
        if (active) await refresh();
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Restore failed";
        setError(msg);
        throw err;
      } finally {
        setRestoring(false);
      }
    },
    [active, refresh],
  );

  const remove = useCallback(
    async (versionId: string) => {
      setRemoving(true);
      setError("");
      try {
        const res = await deleteNoteVersion(versionId);
        if (!res.ok) throw new Error(res.error ?? "Delete failed");
        if (active) await refresh();
        return res;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Delete failed";
        setError(msg);
        throw err;
      } finally {
        setRemoving(false);
      }
    },
    [active, refresh],
  );

  return {
    versions,
    loading,
    restoring,
    removing,
    error,
    refresh,
    checkpoint,
    sessionSnapshot,
    saveSnapshot,
    intervalSnapshot,
    restore,
    remove,
  };
}

export type { NoteVersionSource };
