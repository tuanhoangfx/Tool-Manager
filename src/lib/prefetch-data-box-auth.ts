import { cacheDataBoxSession, readDataBoxSession } from "./data-box-session";
import { ensureWorkspaceAuthReady } from "./workspace-profile";
import { isSupabaseConfigured } from "./supabase";

let prefetchStarted = false;

/** Warm JWT from hub handoff / storage before React auth hook runs. */
export function prefetchDataBoxAuth() {
  if (prefetchStarted || !isSupabaseConfigured) return;
  prefetchStarted = true;

  const snap = readDataBoxSession();
  if (snap?.access_token) {
    void ensureWorkspaceAuthReady().then((session) => {
      if (session) cacheDataBoxSession(session);
    });
    return;
  }

  void ensureWorkspaceAuthReady();
}
