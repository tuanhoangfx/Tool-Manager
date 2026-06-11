import type { Session } from "@supabase/supabase-js";
import {
  authenticateMirrorSupabase,
  HUB_INVALID_LOGIN,
  hubAuthEmailFromLogin,
  isHubAuthRateLimitError,
  recoverHubSessionViaApi,
  runWorkspaceDualSignIn,
  sanitizeHubLoginInput,
  signInWithHubPassword,
} from "@tool-workspace/hub-identity";
import { cacheDataBoxSession } from "./data-box-session";
import { cacheHubIdentity } from "./hub-identity-session";
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL, isHubSupabaseConfigured } from "./hub-supabase-env";
import { authenticateTwofaVault } from "./authenticate-twofa-vault";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";
import { isSupabaseConfigured, supabase } from "./supabase";
import { getIdentitySupabase } from "./supabase-identity";

export type WorkspaceDualSignInResult = {
  identitySession: Session | null;
  dataSession: Session | null;
  dataError: string | null;
  twofaSession: Session | null;
  twofaError: string | null;
};

const recoverToken = (import.meta.env.VITE_HUB_ADMIN_RECOVER_TOKEN as string | undefined)?.trim();
const hubRecoverWorkerBase = (
  (import.meta.env.VITE_CHATCENTER_WORKER_URL as string | undefined) || "http://127.0.0.1:3921"
)
  .trim()
  .replace(/\/$/, "");

function hubRecoverApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${hubRecoverWorkerBase}${p}`;
}

async function recoverHubSessionViaWorker(loginInput: string, password: string) {
  const recovered = await recoverHubSessionViaApi({
    apiUrl: hubRecoverApiUrl,
    loginInput,
    password,
    recoverToken,
    mirrorSessionKey: "chatcenterSession",
  });
  if (!recovered) return null;
  return { identitySession: recovered.identitySession, chatcenterSession: null };
}

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
    return authenticateMirrorSupabase({
      client: supabase,
      authEmail: primaryEmail,
      password,
      mode,
      cacheSession: cacheDataBoxSession,
      planeLabel: "Data Box",
    });
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
  if (lastError && isHubAuthRateLimitError(lastError)) {
    return { session: null, error: lastError };
  }
  if (!lastError || !HUB_INVALID_LOGIN.test(lastError)) {
    return { session: null, error: lastError ?? "Data Box sign-in failed." };
  }

  const mirror = await authenticateMirrorSupabase({
    client: supabase,
    authEmail: primaryEmail,
    password,
    mode: "signup",
    cacheSession: cacheDataBoxSession,
    planeLabel: "Data Box",
  });
  if (mirror.session) return mirror;
  return { session: null, error: mirror.error ?? lastError };
}

/** Sign in / sign up on Tool Hub (identity), then Data Box and 2FA vault. */
export async function signInWorkspaceDual(
  loginInput: string,
  password: string,
  mode: "signin" | "signup",
): Promise<WorkspaceDualSignInResult> {
  if (!isHubSupabaseConfigured) {
    throw new Error("Tool Hub Supabase is not configured (VITE_HUB_SUPABASE_ANON_KEY).");
  }

  const result = await runWorkspaceDualSignIn(loginInput, password, mode, {
    getHubClient: getIdentitySupabase,
    recoverHubSession: recoverHubSessionViaWorker,
    cacheHubIdentityFromSession: (session, mirrorEmail) => {
      cacheHubIdentity({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at ?? null,
        user_id: session.user?.id ?? null,
        user_email: mirrorEmail,
        supabase_url: HUB_SUPABASE_URL,
        supabase_anon_key: HUB_SUPABASE_ANON_KEY,
      });
    },
    planes: [
      {
        authenticate: ({ loginInput: login, password: pwd, mode: authMode }) =>
          authenticateDataBox(login, pwd, authMode),
      },
      {
        authenticate: ({ mirrorEmail, password: pwd, mode: authMode }) =>
          isTwofaSupabaseConfigured
            ? authenticateTwofaVault(mirrorEmail, pwd, authMode)
            : Promise.resolve({ session: null, error: null }),
      },
    ],
  });

  const data = result.planes[0] ?? { session: null, error: null };
  const twofa = result.planes[1] ?? { session: null, error: null };
  if (twofa.error) console.warn("[P0020] 2FA vault mirror:", twofa.error);

  return {
    identitySession: result.identitySession,
    dataSession: data.session,
    dataError: data.error,
    twofaSession: twofa.session,
    twofaError: twofa.error,
  };
}
