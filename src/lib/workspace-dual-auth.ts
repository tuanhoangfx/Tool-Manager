import type { Session } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import {
  hubAuthEmailFromLogin,
  resolveHubLogin,
  sanitizeHubLoginInput,
  signInWithHubPassword,
} from "@tool-workspace/hub-identity";
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL, isHubSupabaseConfigured } from "./hub-supabase-env";
import { cacheDataBoxSession } from "./data-box-session";
import { cacheHubIdentity } from "./hub-identity-session";
import { authenticateTwofaVault } from "./authenticate-twofa-vault";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";
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
  loginInput: string,
  password: string,
  mode: "signin" | "signup",
): Promise<{ session: Session | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { session: null, error: "Data Box Supabase is not configured." };
  }

  const login = sanitizeHubLoginInput(loginInput);
  const primaryEmail = hubAuthEmailFromLogin(login);

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email: primaryEmail, password });
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

  const attempt = async (authEmail: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
    return { data: { session: data.session }, error };
  };

  const signIn = await signInWithHubPassword(login, attempt, "signin");
  if (!signIn.error && signIn.data?.session) {
    cacheDataBoxSession(signIn.data.session);
    return { session: signIn.data.session, error: null };
  }

  const lastError = signIn.error?.message ?? null;
  if (lastError && INVALID_LOGIN.test(lastError)) {
    const mirror = await supabase.auth.signUp({ email: primaryEmail, password });
    if (!mirror.error && mirror.data.session) {
      cacheDataBoxSession(mirror.data.session);
      return { session: mirror.data.session, error: null };
    }
    if (mirror.error) return { session: null, error: mirror.error.message };
  }

  return { session: null, error: lastError ?? "Data Box sign-in failed." };
}

/** Sign in / sign up on Tool Hub (identity), then Data Box and 2FA vault. */
export async function signInWorkspaceDual(
  loginInput: string,
  password: string,
  mode: "signin" | "signup",
): Promise<WorkspaceDualSignInResult> {
  const hub = hubClient();
  if (!hub) {
    throw new Error("Tool Hub Supabase is not configured (VITE_HUB_SUPABASE_ANON_KEY).");
  }

  const login = sanitizeHubLoginInput(loginInput);
  const resolved = resolveHubLogin(login);
  const identityAttempt = async (authEmail: string) => {
    const result =
      mode === "signup"
        ? await hub.auth.signUp({
            email: authEmail,
            password,
            options: {
              data: {
                full_name: resolved.loginId ?? authEmail.split("@")[0],
                login_id: resolved.loginId ?? undefined,
              },
            },
          })
        : await hub.auth.signInWithPassword({ email: authEmail, password });
    return { data: { session: result.data.session }, error: result.error };
  };

  const identityResult = await signInWithHubPassword(login, identityAttempt, mode);
  if (identityResult.error) throw identityResult.error;
  const identitySession = identityResult.data?.session as Session | null | undefined;
  if (!identitySession) {
    throw new Error(
      mode === "signup" ? "Check your email to confirm sign-up on Tool Hub." : "No Hub session returned.",
    );
  }

  if (mode === "signup" && resolved.loginId && identitySession.user?.id) {
    await hub
      .from("profiles")
      .update({
        login_id: resolved.loginId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", identitySession.user.id);
  }

  const mirrorEmail = identitySession.user?.email ?? identityResult.authEmail ?? resolved.authEmail;

  cacheHubIdentity({
    access_token: identitySession.access_token,
    refresh_token: identitySession.refresh_token,
    expires_at: identitySession.expires_at ?? null,
    user_id: identitySession.user?.id ?? null,
    user_email: mirrorEmail,
    supabase_url: HUB_SUPABASE_URL,
    supabase_anon_key: HUB_SUPABASE_ANON_KEY,
  });

  const { session: dataSession, error: dataError } = await authenticateDataBox(login, password, mode);

  const { session: twofaSession, error: twofaError } = isTwofaSupabaseConfigured
    ? await authenticateTwofaVault(mirrorEmail, password, mode)
    : { session: null, error: null };

  if (twofaError) console.warn("[P0020] 2FA vault mirror:", twofaError);

  return {
    identitySession,
    dataSession,
    dataError,
    twofaSession,
    twofaError,
  };
}
