import type { Session } from "@supabase/supabase-js";
import { isHubSyntheticEmail } from "@tool-workspace/hub-identity";
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL } from "./hub-supabase-env";

/** Cached Tool Hub identity relayed from P0004 (postMessage). */

export type HubIdentitySnapshot = {
  access_token: string;
  refresh_token: string;
  expires_at?: number | null;
  user_id: string | null;
  user_email: string | null;
  supabase_url: string;
  supabase_anon_key: string;
  cached_at: number;
};

const STORAGE_KEY = "p0020:hub-identity-v1";

export function cacheHubIdentity(payload: Omit<HubIdentitySnapshot, "cached_at">): void {
  const snapshot: HubIdentitySnapshot = { ...payload, cached_at: Date.now() };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.dispatchEvent(new CustomEvent("p0020:hub-identity"));
}

export function readHubIdentity(): HubIdentitySnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as HubIdentitySnapshot;
  } catch {
    return null;
  }
}

export function clearHubIdentity(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("p0020:hub-identity"));
}

/** Data Box-only session (magic link) — keep header email without a Hub JWT. */
export function ensureHubIdentityStubFromDataSession(session: Session | null | undefined): void {
  if (!session?.user?.email || readHubIdentity()) return;
  const email = session.user.email.trim().toLowerCase();
  if (!isHubSyntheticEmail(email)) return;
  cacheHubIdentity({
    access_token: "",
    refresh_token: "",
    expires_at: session.expires_at ?? null,
    user_id: session.user.id ?? null,
    user_email: email,
    supabase_url: HUB_SUPABASE_URL,
    supabase_anon_key: HUB_SUPABASE_ANON_KEY,
  });
}
