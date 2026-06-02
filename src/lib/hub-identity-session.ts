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
