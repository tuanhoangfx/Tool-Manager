import type { Session } from "@supabase/supabase-js";
import { cacheWorkspaceProfileRoleForUsers, normalizeWorkspaceRoleKey } from "@tool-workspace/hub-ui";
import type { Profile } from "../features/todo/types";
import { todoProfileEmailKeys } from "../features/todo/todo-profile-display";

export function profileRoleToWorkspaceKey(role: Profile["role"] | string | null | undefined): string {
  return normalizeWorkspaceRoleKey(role ?? "employee");
}

export function findDirectoryProfile(
  users: Profile[],
  opts: { userId?: string | null; email?: string | null },
): Profile | undefined {
  const { userId, email } = opts;
  if (userId) {
    const byId = users.find((u) => u.id === userId);
    if (byId) return byId;
  }
  const keys = todoProfileEmailKeys(email);
  if (!keys.length) return undefined;
  return users.find((u) => {
    const userKeys = todoProfileEmailKeys(u.email);
    return keys.some((key) => userKeys.includes(key));
  });
}

/** Warm Hub sidebar role cache from merged P0020 user directory (same SSOT as Todo avatars). */
export function warmWorkspaceRoleFromDirectory(
  users: Profile[],
  opts: { dataBoxUserId: string; hubUserId?: string | null; hubEmail?: string | null },
): void {
  const match = findDirectoryProfile(users, {
    userId: opts.dataBoxUserId,
    email: opts.hubEmail,
  });
  if (!match) return;
  const roleKey = profileRoleToWorkspaceKey(match.role);
  const userIds = [opts.dataBoxUserId];
  const hubId = opts.hubUserId?.trim();
  if (hubId && hubId !== opts.dataBoxUserId) userIds.push(hubId);
  cacheWorkspaceProfileRoleForUsers(userIds, roleKey);
}

export async function warmWorkspaceRoleForSession(
  session: Session | null,
  opts?: { hubUserId?: string | null; hubEmail?: string | null },
): Promise<void> {
  if (!session?.user?.id) return;
  const { fetchWorkspaceUserDirectory } = await import("./workspace-user-directory");
  const { users } = await fetchWorkspaceUserDirectory(session);
  warmWorkspaceRoleFromDirectory(users, {
    dataBoxUserId: session.user.id,
    hubUserId: opts?.hubUserId,
    hubEmail: opts?.hubEmail ?? session.user.email,
  });
}
