import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { readHubIdentity, type HubIdentitySnapshot } from "./hub-identity-session";
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL } from "./hub-supabase-env";

let cachedClient: SupabaseClient | null = null;
let cachedClientKey: string | null = null;

export function getIdentitySupabase(snapshot?: HubIdentitySnapshot | null): SupabaseClient | null {
  const snap = snapshot ?? readHubIdentity();
  const url = snap?.supabase_url?.trim() || HUB_SUPABASE_URL;
  const anon = snap?.supabase_anon_key?.trim() || HUB_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const key = `${url}|${anon}`;
  if (!cachedClient || cachedClientKey !== key) {
    cachedClient = createClient(url, anon);
    cachedClientKey = key;
  }
  return cachedClient;
}

/** Apply Tool Hub (P0004) session relayed via postMessage. */
export async function applyHubIdentitySession(): Promise<Session | null> {
  const snap = readHubIdentity();
  if (!snap?.access_token) return null;
  const client = getIdentitySupabase(snap);
  if (!client) return null;
  const { data, error } = await client.auth.setSession({
    access_token: snap.access_token,
    refresh_token: snap.refresh_token || "",
  });
  if (error) return null;
  return data.session;
}

export async function getHubIdentitySession(): Promise<Session | null> {
  const applied = await applyHubIdentitySession();
  if (applied) return applied;
  const client = getIdentitySupabase();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session ?? null;
}
