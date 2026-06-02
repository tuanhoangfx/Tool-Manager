import type { Session } from "@supabase/supabase-js";
import { cacheDataBoxSession, readDataBoxSession } from "./data-box-session";
import { isSupabaseConfigured, supabase } from "./supabase";

/** Restore or verify Data Box JWT on the notes/cookie Supabase client. */
export async function ensureDataBoxAuth(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) return existing.session;

  const snap = readDataBoxSession();
  if (!snap?.access_token) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: snap.access_token,
    refresh_token: snap.refresh_token || "",
  });
  if (error || !data.session) return null;
  cacheDataBoxSession(data.session);
  return data.session;
}
