import type { Session } from "@supabase/supabase-js";
import { cacheDataBoxSession } from "./data-box-session";
import { isSupabaseConfigured, supabase } from "./supabase";

/** P0020 tool sign-in — Data Box only. User/role management stays on Tool Hub (P0004). */
export async function signInDataBox(
  email: string,
  password: string,
  mode: "signin" | "signup",
): Promise<Session> {
  if (!isSupabaseConfigured) {
    throw new Error("Data Box Supabase is not configured (VITE_SUPABASE_*).");
  }

  const action =
    mode === "signup"
      ? supabase.auth.signUp({ email: email.trim(), password })
      : supabase.auth.signInWithPassword({ email: email.trim(), password });

  const { data, error } = await action;
  if (error) throw error;
  const session = data.session;
  if (!session) {
    throw new Error(
      mode === "signup"
        ? "Check your email to confirm sign-up, or disable Confirm email in Supabase Auth."
        : "No Data Box session returned.",
    );
  }

  cacheDataBoxSession(session);
  return session;
}
