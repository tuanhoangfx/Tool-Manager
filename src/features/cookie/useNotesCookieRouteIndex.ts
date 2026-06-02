import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { COOKIE_BINDINGS_CHANGE_EVENT, loadCookieBindings } from "./cookieBridge";
import type { CookieCloudRouteRow } from "./cookieRoutesRepository";
import { normalizeCookieDomain } from "./normalizeCookieDomain";
import { addNotesCookieListener } from "./notesCookieRealtimeHub";

/** noteId → primary route domain (for list rail icon). */
export type NotesCookieRouteIndex = Map<string, string>;

function mergeLocalIntoIndex(index: NotesCookieRouteIndex) {
  for (const binding of loadCookieBindings()) {
    if (!binding.enabled) continue;
    const noteId = binding.noteId?.trim();
    const domain = normalizeCookieDomain(binding.domain);
    if (!noteId || !domain) continue;
    if (!index.has(noteId)) index.set(noteId, domain);
  }
}

async function fetchCloudRouteIndex(session: Session): Promise<NotesCookieRouteIndex> {
  const index: NotesCookieRouteIndex = new Map();

  let accessible = await supabase.rpc("note_cookie_routes_accessible_v2");
  if (
    accessible.error &&
    /note_cookie_routes_accessible_v2|PGRST202|Could not find|schema cache|404/i.test(accessible.error.message ?? "")
  ) {
    accessible = await supabase.rpc("note_cookie_routes_accessible");
  }

  if (!accessible.error && Array.isArray(accessible.data)) {
    for (const row of accessible.data as CookieCloudRouteRow[]) {
      if (row.enabled === false) continue;
      const noteId = row.note_id?.trim();
      const domain = normalizeCookieDomain(row.domain);
      if (!noteId || !domain || index.has(noteId)) continue;
      index.set(noteId, domain);
    }
    return index;
  }

  const { data, error } = await supabase
    .from("cookie_bridge_routes")
    .select("note_id,domain,enabled")
    .eq("enabled", true);

  if (error) return index;

  for (const row of (data ?? []) as Pick<CookieCloudRouteRow, "note_id" | "domain" | "enabled">[]) {
    if (row.enabled === false) continue;
    const noteId = row.note_id?.trim();
    const domain = normalizeCookieDomain(row.domain);
    if (!noteId || !domain || index.has(noteId)) continue;
    index.set(noteId, domain);
  }

  return index;
}

export function useNotesCookieRouteIndex(session: Session | null) {
  const [routeByNoteId, setRouteByNoteId] = useState<NotesCookieRouteIndex>(() => new Map());

  const refresh = useCallback(async () => {
    const next: NotesCookieRouteIndex = new Map();
    mergeLocalIntoIndex(next);
    if (session?.user?.id) {
      const cloud = await fetchCloudRouteIndex(session);
      for (const [noteId, domain] of cloud) {
        if (!next.has(noteId)) next.set(noteId, domain);
      }
    }
    setRouteByNoteId(next);
  }, [session?.user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const hasCookieRoute = useCallback((noteId: string) => routeByNoteId.has(noteId), [routeByNoteId]);

  const primaryDomain = useCallback((noteId: string) => routeByNoteId.get(noteId) ?? null, [routeByNoteId]);

  return { routeByNoteId, hasCookieRoute, primaryDomain, refreshRouteIndex: refresh };
}
