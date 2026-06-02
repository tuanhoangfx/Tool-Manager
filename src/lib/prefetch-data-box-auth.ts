import { cacheDataBoxSession, readDataBoxSession } from "./data-box-session";
import { ensureDataBoxAuth } from "./ensure-data-box-auth";
import { isSupabaseConfigured } from "./supabase";

let prefetchStarted = false;

/** Warm JWT from hub handoff / storage before React auth hook runs. */
export function prefetchDataBoxAuth() {
  if (prefetchStarted || !isSupabaseConfigured) return;
  prefetchStarted = true;

  const snap = readDataBoxSession();
  if (snap?.access_token) {
    void ensureDataBoxAuth().then((session) => {
      if (session) cacheDataBoxSession(session);
    });
    return;
  }

  void ensureDataBoxAuth();
}
