import type { Session } from "@supabase/supabase-js";
import {
  fetchWorkspaceUserDirectoryRows,
  workspaceDirectoryRowToProfile,
  type WorkspaceUserDirectoryRow,
} from "@tool-workspace/hub-ui";
import { supabase } from "./supabase";
import type { Profile } from "../features/todo/types";
import { ensureWorkspaceAuthReady, ensureWorkspaceProfile } from "./workspace-profile";

export type { WorkspaceUserDirectoryRow } from "@tool-workspace/hub-ui";

export function directoryRowToProfile(row: WorkspaceUserDirectoryRow): Profile {
  return workspaceDirectoryRowToProfile(row) as Profile;
}

/** Hub identity directory — wraps shared hub-ui RPC helper + P0020 auth bootstrap. */
export async function fetchWorkspaceUserDirectory(session: Session | null): Promise<{
  users: Profile[];
  warning: string | null;
}> {
  if (!session?.user?.id) return { users: [], warning: null };

  const ready = await ensureWorkspaceAuthReady();
  if (!ready) return { users: [], warning: "Session not ready" };

  const fallback = await ensureWorkspaceProfile(session.user);
  const { users, warning } = await fetchWorkspaceUserDirectoryRows(
    supabase,
    session,
    fallback
      ? {
          id: fallback.id,
          full_name: fallback.full_name,
          avatar_url: fallback.avatar_url,
          email: fallback.email,
          role: fallback.role,
          updated_at: fallback.updated_at,
          last_sign_in_at: fallback.last_sign_in_at,
          created_at: fallback.created_at,
        }
      : null,
  );

  return { users: users as Profile[], warning };
}
