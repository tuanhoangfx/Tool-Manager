import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "../features/todo/types";
import { ensureWorkspaceAuthReady, ensureWorkspaceProfile } from "./workspace-profile";

/** Row shape from `workspace_user_directory()` — shared with P0004 Tool Hub. */
export type WorkspaceUserDirectoryRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  last_sign_in_at?: string | null;
  last_activity_at?: string | null;
  project_count?: number | null;
  project_names?: string[] | null;
  activity_count?: number | null;
};

function cleanProfileRole(value: string | null | undefined): Profile["role"] {
  if (value === "admin" || value === "manager") return value;
  return "employee";
}

export function directoryRowToProfile(row: WorkspaceUserDirectoryRow): Profile {
  return {
    id: row.id,
    full_name: row.full_name ?? null,
    avatar_url: row.avatar_url ?? null,
    email: row.email ?? null,
    role: cleanProfileRole(row.role),
    updated_at: row.updated_at ?? null,
    last_sign_in_at: row.last_sign_in_at ?? row.last_activity_at ?? null,
    created_at: row.created_at ?? undefined,
  };
}

function missingRpc(message: string) {
  return /workspace_user_directory/i.test(message) && /does not exist|not found|PGRST202|42883/i.test(message);
}

function dedupeProfiles(users: Profile[]): Profile[] {
  const seen = new Set<string>();
  return users.filter((user) => {
    if (!user.id || seen.has(user.id)) return false;
    seen.add(user.id);
    return true;
  });
}

/** Hub identity directory — same RPC as P0004 `fetchUserManagementRows`. */
export async function fetchWorkspaceUserDirectory(session: Session | null): Promise<{
  users: Profile[];
  warning: string | null;
}> {
  if (!session?.user?.id) return { users: [], warning: null };

  const ready = await ensureWorkspaceAuthReady();
  if (!ready) return { users: [], warning: "Session not ready" };

  const directory = await supabase.rpc("workspace_user_directory");

  if (!directory.error && Array.isArray(directory.data)) {
    const users = dedupeProfiles(
      (directory.data as WorkspaceUserDirectoryRow[])
        .map(directoryRowToProfile)
        .filter((profile) => profile.id),
    );
    return { users, warning: null };
  }

  const message = directory.error?.message ?? "Unable to load user directory from database.";
  if (!missingRpc(message)) {
    console.warn("[workspace-user-directory]", message);
    return { users: [], warning: message };
  }

  const profile = await ensureWorkspaceProfile(session.user);
  return {
    users: profile ? [profile] : [],
    warning:
      "Missing RPC workspace_user_directory. Apply supabase/migrations/20260528170000_workspace_user_directory.sql.",
  };
}
