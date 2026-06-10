import type { Session } from "@supabase/supabase-js";
import { cacheTwofaSession, readTwofaSession } from "./twofa-session";
import { getTwofaSupabase } from "./twofa-supabase";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";

/** Restore or verify 2FA vault JWT on the dedicated Supabase client. */
export async function ensureTwofaAuth(): Promise<Session | null> {
  const twofa = getTwofaSupabase();
  if (!twofa || !isTwofaSupabaseConfigured) return null;

  const { data: existing } = await twofa.auth.getSession();
  if (existing.session) {
    cacheTwofaSession(existing.session);
    return existing.session;
  }

  const snap = readTwofaSession();
  if (!snap?.access_token) return null;

  const { data, error } = await twofa.auth.setSession({
    access_token: snap.access_token,
    refresh_token: snap.refresh_token || "",
  });
  if (error || !data.session) return null;
  cacheTwofaSession(data.session);
  return data.session;
}
