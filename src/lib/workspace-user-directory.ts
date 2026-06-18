import type { Session } from "@supabase/supabase-js";
import {
  fetchWorkspaceUserDirectoryRows,
  workspaceDirectoryRowToProfile,
  type WorkspaceDirectoryProfile,
  type WorkspaceUserDirectoryRow,
} from "@tool-workspace/hub-ui";
import { hubDisplayEmail } from "@tool-workspace/hub-identity";
import { supabase } from "./supabase";
import type { Profile } from "../features/todo/types";
import { todoProfileEmailKeys } from "../features/todo/todo-profile-display";
import { ensureWorkspaceAuthReady, ensureWorkspaceProfile } from "./workspace-profile";
import { isHubSupabaseConfigured } from "./hub-supabase-env";
import { applyHubIdentitySession, getIdentitySupabase } from "./supabase-identity";

export type { WorkspaceUserDirectoryRow } from "@tool-workspace/hub-ui";

export function directoryRowToProfile(row: WorkspaceUserDirectoryRow): Profile {
  return workspaceDirectoryRowToProfile(row) as Profile;
}

function toDirectoryProfile(profile: Profile): WorkspaceDirectoryProfile {
  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    email: profile.email ?? null,
    role: profile.role,
    updated_at: profile.updated_at,
    last_sign_in_at: profile.last_sign_in_at ?? null,
    created_at: profile.created_at,
  };
}

function missingTodoAssigneeRpc(message: string) {
  return /todo_assignee_directory/i.test(message) && /does not exist|not found|PGRST202|42883/i.test(message);
}

function missingHubTodoRosterRpc(message: string) {
  return /hub_todo_user_roster/i.test(message) && /does not exist|not found|PGRST202|42883/i.test(message);
}

function rowsToProfiles(rows: WorkspaceUserDirectoryRow[]): Profile[] {
  const users = rows.map(directoryRowToProfile).filter((profile) => profile.id);
  return [...new Map(users.map((u) => [u.id, u])).values()];
}

/** Full Todo assignee roster (all auth.users) — employees included. */
async function fetchTodoAssigneeDirectoryRows(
  session: Session | null,
  fallbackProfile?: WorkspaceDirectoryProfile | null,
): Promise<{ users: Profile[]; warning: string | null }> {
  if (!session?.user?.id) return { users: [], warning: null };

  const directory = await supabase.rpc("todo_assignee_directory");

  if (!directory.error && Array.isArray(directory.data)) {
    return { users: rowsToProfiles(directory.data as WorkspaceUserDirectoryRow[]), warning: null };
  }

  const message = directory.error?.message ?? "Unable to load todo assignee directory.";
  if (!missingTodoAssigneeRpc(message)) {
    console.warn("[workspace-user-directory] todo_assignee_directory:", message);
    return { users: [], warning: message };
  }

  const fallback = await fetchWorkspaceUserDirectoryRows(supabase, session, fallbackProfile);
  return { users: fallback.users as Profile[], warning: fallback.warning };
}

/** Hub P0020 roster — all default-tool users regardless of caller Hub role. */
async function fetchHubTodoUserRoster(
  hubClient: NonNullable<ReturnType<typeof getIdentitySupabase>>,
  hubSession: Session,
): Promise<{ users: WorkspaceDirectoryProfile[]; warning: string | null }> {
  const roster = await hubClient.rpc("hub_todo_user_roster");

  if (!roster.error && Array.isArray(roster.data)) {
    const users = (roster.data as WorkspaceUserDirectoryRow[])
      .map(workspaceDirectoryRowToProfile)
      .filter((profile) => profile.id);
    const deduped = [...new Map(users.map((u) => [u.id, u])).values()];
    return { users: deduped, warning: null };
  }

  const message = roster.error?.message ?? "Unable to load Hub todo user roster.";
  if (!missingHubTodoRosterRpc(message)) {
    console.warn("[workspace-user-directory] hub_todo_user_roster:", message);
  }

  return fetchWorkspaceUserDirectoryRows(hubClient, hubSession, null);
}

function buildEmailIndex(profiles: Profile[]): Map<string, Profile> {
  const index = new Map<string, Profile>();
  for (const profile of profiles) {
    for (const key of todoProfileEmailKeys(profile.email)) {
      index.set(key, profile);
    }
    if (profile.email) index.set(profile.email.toLowerCase(), profile);
  }
  return index;
}

/** Map P0004 Hub roster onto Data Box UUIDs (assignee FK) by auth email. */
export function mergeHubDirectoryOntoDataBox(
  hubUsers: WorkspaceDirectoryProfile[],
  dataBoxUsers: Profile[],
): Profile[] {
  const byEmail = buildEmailIndex(dataBoxUsers);
  const merged = new Map<string, Profile>();

  for (const hubUser of hubUsers) {
    const keys = todoProfileEmailKeys(hubUser.email);
    let dataBox =
      keys.map((key) => byEmail.get(key)).find(Boolean) ??
      dataBoxUsers.find((row) => row.id === hubUser.id);

    if (!dataBox) continue;

    const displayEmail =
      hubDisplayEmail({ authEmail: hubUser.email, profileEmail: dataBox.email }) || dataBox.email;

    merged.set(dataBox.id, {
      ...dataBox,
      full_name: hubUser.full_name?.trim() || dataBox.full_name,
      avatar_url: hubUser.avatar_url ?? dataBox.avatar_url,
      email: displayEmail ?? dataBox.email,
      role:
        hubUser.role === "admin" || hubUser.role === "manager" || hubUser.role === "employee"
          ? hubUser.role
          : dataBox.role,
    });
  }

  for (const profile of dataBoxUsers) {
    if (!merged.has(profile.id)) merged.set(profile.id, profile);
  }

  return [...merged.values()];
}

/** Hub identity directory — Data Box UUIDs + P0004 Hub roster when Hub JWT is available. */
export async function fetchWorkspaceUserDirectory(session: Session | null): Promise<{
  users: Profile[];
  warning: string | null;
}> {
  if (!session?.user?.id) return { users: [], warning: null };

  const ready = await ensureWorkspaceAuthReady();
  if (!ready) return { users: [], warning: "Session not ready" };

  const fallback = await ensureWorkspaceProfile(session.user);
  const fallbackDto = fallback ? toDirectoryProfile(fallback) : null;

  const dataBoxResult = await fetchTodoAssigneeDirectoryRows(session, fallbackDto);
  let users = dataBoxResult.users;
  let warning = dataBoxResult.warning;

  if (isHubSupabaseConfigured) {
    try {
      const hubSession = await applyHubIdentitySession();
      const hubClient = getIdentitySupabase();
      if (hubClient && hubSession?.user?.id) {
        const hubResult = await fetchHubTodoUserRoster(hubClient, hubSession);
        if (!hubResult.warning && hubResult.users.length > 0) {
          users = mergeHubDirectoryOntoDataBox(hubResult.users, users);
        } else if (hubResult.warning && !warning) {
          warning = hubResult.warning;
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[workspace-user-directory] Hub directory merge skipped:", message);
    }
  }

  return { users, warning };
}
