import type { Session } from "@supabase/supabase-js";

export type TwofaSessionSnapshot = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
  user_id: string | null;
  user_email: string | null;
  cached_at: number;
};

const STORAGE_KEY = "p0020:twofa-session-v1";

export function cacheTwofaSession(session: Session): void {
  const snapshot: TwofaSessionSnapshot = {
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? "",
    expires_at: session.expires_at ?? null,
    user_id: session.user?.id ?? null,
    user_email: session.user?.email ?? null,
    cached_at: Date.now(),
  };
  const prev = readTwofaSession();
  if (
    prev?.access_token === snapshot.access_token &&
    prev?.refresh_token === snapshot.refresh_token &&
    prev?.user_id === snapshot.user_id
  ) {
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent("p0020:twofa-session"));
}

export function readTwofaSession(): TwofaSessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TwofaSessionSnapshot;
  } catch {
    return null;
  }
}

export function clearTwofaSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("p0020:twofa-session"));
}
