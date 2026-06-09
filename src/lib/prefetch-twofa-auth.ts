import { cacheTwofaSession, readTwofaSession } from "./twofa-session";
import { ensureTwofaAuth } from "./ensure-twofa-auth";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";

let prefetchStarted = false;

/** Warm 2FA vault JWT from sessionStorage before cloud sync hooks run. */
export function prefetchTwofaAuth() {
  if (prefetchStarted || !isTwofaSupabaseConfigured) return;
  prefetchStarted = true;

  const snap = readTwofaSession();
  if (snap?.access_token) {
    void ensureTwofaAuth().then((session) => {
      if (session) cacheTwofaSession(session);
    });
    return;
  }

  void ensureTwofaAuth();
}
