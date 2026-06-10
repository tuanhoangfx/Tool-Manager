import type { Session } from "@supabase/supabase-js";
import { ensureDataBoxAuth } from "./ensure-data-box-auth";
import { readDataBoxSession, sessionFromDataBoxSnapshot } from "./data-box-session";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { Profile } from "../features/todo/types";

/** Restore Data Box JWT before any RLS query (Todo profiles, Notes, Cookie). */
export async function ensureWorkspaceAuthReady(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  return ensureDataBoxAuth();
}

/** Ensure profiles row exists for the signed-in user (Todo Kanban bootstrap). */
export async function ensureWorkspaceProfile(user: Session["user"]): Promise<Profile | null> {
  const session = await ensureWorkspaceAuthReady();
  if (!session?.user?.id) return null;

  const { data: ensured, error: rpcError } = await supabase.rpc("todo_ensure_profile");
  if (!rpcError && ensured) {
    return ensured as Profile;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  if (data) return data as Profile;

  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email,
      email: user.email,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return (newProfile as Profile) ?? null;
}

/** True when shell painted a cached session but JWT is not on the Supabase client yet. */
export function hasPaintedDataBoxSession(): boolean {
  return Boolean(sessionFromDataBoxSnapshot(readDataBoxSession()));
}
