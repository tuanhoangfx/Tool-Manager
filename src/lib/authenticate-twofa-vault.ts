import type { Session } from "@supabase/supabase-js";
import { cacheTwofaSession } from "./twofa-session";
import { getTwofaSupabase } from "./twofa-supabase";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";

const INVALID_LOGIN = /invalid login credentials/i;

/**
 * Mirror Hub-validated credentials onto the dedicated 2FA Supabase project (RLS).
 * Same email/password pattern as Data Box — no extra sign-up UI.
 */
export async function authenticateTwofaVault(
  email: string,
  password: string,
  mode: "signin" | "signup",
): Promise<{ session: Session | null; error: string | null }> {
  const twofa = getTwofaSupabase();
  if (!twofa || !isTwofaSupabaseConfigured) {
    return { session: null, error: null };
  }

  const trimmed = email.trim();
  const signIn = () => twofa.auth.signInWithPassword({ email: trimmed, password });
  const signUp = () => twofa.auth.signUp({ email: trimmed, password });

  if (mode === "signup") {
    const { data, error } = await signUp();
    if (error) return { session: null, error: error.message };
    if (!data.session) {
      return {
        session: null,
        error: "Check your email to confirm sign-up on 2FA vault, or disable Confirm email in Supabase Auth.",
      };
    }
    cacheTwofaSession(data.session);
    return { session: data.session, error: null };
  }

  const first = await signIn();
  if (!first.error && first.data.session) {
    cacheTwofaSession(first.data.session);
    return { session: first.data.session, error: null };
  }

  if (first.error && INVALID_LOGIN.test(first.error.message)) {
    const mirror = await signUp();
    if (!mirror.error && mirror.data.session) {
      cacheTwofaSession(mirror.data.session);
      return { session: mirror.data.session, error: null };
    }
    if (mirror.error) return { session: null, error: mirror.error.message };
  }

  return { session: null, error: first.error?.message ?? "2FA vault sign-in failed." };
}
