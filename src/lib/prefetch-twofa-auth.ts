import { cacheTwofaSession, readTwofaSession } from "./twofa-session";
import { ensureTwofaAuth } from "./ensure-twofa-auth";
import { prefetchTwofaVaultBackground } from "./prefetch-twofa-vault-background";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";

let prefetchStarted = false;

/** Warm 2FA vault JWT from sessionStorage / Supabase persistence before cloud sync hooks run. */
export function prefetchTwofaAuth() {
  if (prefetchStarted || !isTwofaSupabaseConfigured) return;
  prefetchStarted = true;

  const warm = () => {
    void ensureTwofaAuth().then((session) => {
      if (session) cacheTwofaSession(session);
      prefetchTwofaVaultBackground();
    });
  };

  if (readTwofaSession()?.access_token) warm();
  else void ensureTwofaAuth();

  window.addEventListener("p0020:twofa-session", warm);
  window.addEventListener("p0020:databox-session", warm);
}
