/** Cached Data Box (P0020) auth session — separate from Tool Hub identity relay. */

import type { Session } from "@supabase/supabase-js";

export type DataBoxSessionSnapshot = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
  user_id: string | null;
  user_email: string | null;
  cached_at: number;
};

const STORAGE_KEY = "p0020:databox-session-v1";

export function cacheDataBoxSession(session: Session): void {
  const snapshot: DataBoxSessionSnapshot = {
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? "",
    expires_at: session.expires_at ?? null,
    user_id: session.user?.id ?? null,
    user_email: session.user?.email ?? null,
    cached_at: Date.now(),
  };
  const prev = readDataBoxSession();
  if (
    prev?.access_token === snapshot.access_token &&
    prev?.refresh_token === snapshot.refresh_token &&
    prev?.user_id === snapshot.user_id
  ) {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent("p0020:databox-session"));
}

export function readDataBoxSession(): DataBoxSessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DataBoxSessionSnapshot;
  } catch {
    return null;
  }
}

/** Paint shell immediately from cached tokens while Supabase auth finishes in background. */
export function sessionFromDataBoxSnapshot(snap: DataBoxSessionSnapshot | null): Session | null {
  if (!snap?.access_token?.trim()) return null;
  return {
    access_token: snap.access_token,
    refresh_token: snap.refresh_token ?? "",
    expires_at: snap.expires_at ?? undefined,
    token_type: "bearer",
    user: {
      id: snap.user_id ?? "",
      email: snap.user_email ?? undefined,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "",
    },
  } as Session;
}

export function clearDataBoxSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("p0020:databox-session"));
}
