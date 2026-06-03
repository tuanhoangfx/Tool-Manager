import type { Session } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL, isHubSupabaseConfigured } from "./hub-supabase-env";
import { cacheDataBoxSession } from "./data-box-session";
import { cacheHubIdentity } from "./hub-identity-session";
import { authenticateTwofaVault } from "./authenticate-twofa-vault";
import { isSupabaseConfigured, supabase } from "./supabase";

export type WorkspaceDualSignInResult = {
  identitySession: Session | null;
  dataSession: Session | null;
  dataError: string | null;
  twofaSession: Session | null;
  twofaError: string | null;
};

function hubClient() {
  if (!isHubSupabaseConfigured) return null;
  return createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY);
}

const INVALID_LOGIN = /invalid login credentials/i;

/**
 * Data Box keeps its own auth.users for RLS on notes / cookie / 2FA data.
 * After Hub validates the password, mirror the account here if missing (no extra sign-up UI).
 */
async function authenticateDataBox(
  email: string,
  password: string,
  mode: "signin" | "signup",
): Promise<{ session: Session | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { session: null, error: "Data Box Supabase is not configured." };
  }

  const trimmed = email.trim();
  const signIn = () => supabase.auth.signInWithPassword({ email: trimmed, password });
  const signUp = () => supabase.auth.signUp({ email: trimmed, password });

  if (mode === "signup") {
    const { data, error } = await signUp();
    if (error) return { session: null, error: error.message };
    if (!data.session) {
      return {
        session: null,
        error: "Check your email to confirm sign-up on Data Box, or disable Confirm email in Supabase Auth.",
      };
    }
    cacheDataBoxSession(data.session);
    return { session: data.session, error: null };
  }

  const first = await signIn();
  if (!first.error && first.data.session) {
    cacheDataBoxSession(first.data.session);
    return { session: first.data.session, error: null };
  }

  if (first.error && INVALID_LOGIN.test(first.error.message)) {
    const mirror = await signUp();
    if (!mirror.error && mirror.data.session) {
      cacheDataBoxSession(mirror.data.session);
      return { session: mirror.data.session, error: null };
    }
    if (mirror.error) return { session: null, error: mirror.error.message };
  }

  return { session: null, error: first.error?.message ?? "Data Box sign-in failed." };
}

/** Sign in / sign up on Tool Hub (identity), then Data Box for app + cookie APIs. */
export async function signInWorkspaceDual(
  email: string,
  password: string,
  mode: "signin" | "signup",
): Promise<WorkspaceDualSignInResult> {
  const hub = hubClient();
  if (!hub) {
    throw new Error("Tool Hub Supabase is not configured (VITE_HUB_SUPABASE_ANON_KEY).");
  }

  const identityAction =
    mode === "signup"
      ? hub.auth.signUp({ email: email.trim(), password })
      : hub.auth.signInWithPassword({ email: email.trim(), password });

  const { data: identityData, error: identityError } = await identityAction;
  if (identityError) throw identityError;
  const identitySession = identityData.session;
  if (!identitySession) {
    throw new Error(mode === "signup" ? "Check your email to confirm sign-up on Tool Hub." : "No Hub session returned.");
  }

  cacheHubIdentity({
    access_token: identitySession.access_token,
    refresh_token: identitySession.refresh_token,
    expires_at: identitySession.expires_at ?? null,
    user_id: identitySession.user?.id ?? null,
    user_email: identitySession.user?.email ?? email.trim(),
    supabase_url: HUB_SUPABASE_URL,
    supabase_anon_key: HUB_SUPABASE_ANON_KEY,
  });

  const [{ session: dataSession, error: dataError }, { session: twofaSession, error: twofaError }] =
    await Promise.all([
      authenticateDataBox(email, password, mode),
      authenticateTwofaVault(email, password, mode),
    ]);

  return { identitySession, dataSession, dataError, twofaSession, twofaError };
}
