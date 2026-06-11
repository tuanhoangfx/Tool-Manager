import type { Session } from "@supabase/supabase-js";
import { authenticateMirrorSupabase } from "@tool-workspace/hub-identity";
import { cacheTwofaSession } from "./twofa-session";
import { getTwofaSupabase } from "./twofa-supabase";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";

export async function authenticateTwofaVault(
  email: string,
  password: string,
  mode: "signin" | "signup",
): Promise<{ session: Session | null; error: string | null }> {
  const twofa = getTwofaSupabase();
  if (!twofa || !isTwofaSupabaseConfigured) {
    return { session: null, error: null };
  }

  return authenticateMirrorSupabase({
    client: twofa,
    authEmail: email,
    password,
    mode,
    cacheSession: cacheTwofaSession,
    planeLabel: "2FA vault",
    confirmSignUpMessage:
      "Check your email to confirm sign-up on 2FA vault, or disable Confirm email in Supabase Auth.",
  });
}
