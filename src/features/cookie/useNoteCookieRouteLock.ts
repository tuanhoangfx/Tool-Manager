import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { readNoteRouteLockStale, writeNoteRouteLockCache } from "../../lib/note-route-lock-cache";
import {
  COOKIE_BINDINGS_CHANGE_EVENT,
  getActiveCookieBindingsForNote,
} from "./cookieBridge";
import { fetchEnabledCloudRoutesForNote } from "./cookieRoutesRepository";
import {
  formatNoteRouteLockSummary,
  mergeNoteRouteLockInfo,
  type NoteRouteLockInfo,
} from "./noteRouteLockInfo";
import { addNotesCookieListener } from "./notesCookieRealtimeHub";

export type { NoteRouteLockInfo } from "./noteRouteLockInfo";

function localRoutesForNote(noteId: string): NoteRouteLockInfo[] {
  return mergeNoteRouteLockInfo([], getActiveCookieBindingsForNote(noteId));
}

function routesEqual(a: NoteRouteLockInfo[], b: NoteRouteLockInfo[]): boolean {
  if (a.length !== b.length) return false;
  const keysA = a.map((r) => r.domain).sort().join("\0");
  const keysB = b.map((r) => r.domain).sort().join("\0");
  return keysA === keysB;
}

/** Cloud + local Cookie routes — title-only editor when any enabled route targets this note. */
export function useNoteCookieRouteLock(session: Session | null, noteId: string | null) {
  const [routeInfos, setRouteInfos] = useState<NoteRouteLockInfo[]>(() => {
    if (!noteId) return [];
    return readNoteRouteLockStale(noteId) ?? localRoutesForNote(noteId);
  });
  const trackedNoteId = useRef(noteId);
  const fetchGen = useRef(0);

  if (noteId !== trackedNoteId.current) {
    trackedNoteId.current = noteId;
    fetchGen.current += 1;
    if (!noteId) {
      setRouteInfos([]);
    } else {
      const cached = readNoteRouteLockStale(noteId);
      setRouteInfos(cached ?? localRoutesForNote(noteId));
    }
  }

  const commitRoutes = useCallback((routes: NoteRouteLockInfo[]) => {
    setRouteInfos((prev) => (routesEqual(prev, routes) ? prev : routes));
    if (noteId) writeNoteRouteLockCache(noteId, routes);
  }, [noteId]);

  const refresh = useCallback(async () => {
    const targetId = noteId;
    if (!targetId?.trim()) {
      setRouteInfos([]);
      return;
    }
    const gen = fetchGen.current;
    const local = getActiveCookieBindingsForNote(targetId);
    const cloudRes = session
      ? await fetchEnabledCloudRoutesForNote(session, targetId)
      : { ok: true as const, routes: [] };
    if (gen !== fetchGen.current || targetId !== noteId) return;
    const cloud = cloudRes.ok ? cloudRes.routes : [];
    commitRoutes(mergeNoteRouteLockInfo(cloud, local));
  }, [commitRoutes, noteId, session?.user?.id]);

  useEffect(() => {
    if (!noteId?.trim()) return;
    void refresh();
  }, [noteId, refresh]);

  useEffect(() => {
    const sync = () => void refresh();
    window.addEventListener(COOKIE_BINDINGS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(COOKIE_BINDINGS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [refresh]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    return addNotesCookieListener(userId, () => void refresh());
  }, [refresh, session?.user?.id]);

  const routeDomains = routeInfos.map((r) => r.domain);

  return {
    routeLocked: routeInfos.length > 0,
    routeInfos,
    routeDomains,
    routeSummary: formatNoteRouteLockSummary(routeInfos),
    refreshRouteLock: refresh,
  };
}
