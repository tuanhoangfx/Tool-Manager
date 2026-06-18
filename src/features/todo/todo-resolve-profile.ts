import type { Profile } from "./types";
import { todoProfileContactEmail, todoProfileDisplayLabel, todoProfileLoginId } from "./todo-profile-display";

type PartialProfile = Partial<Profile> & { full_name?: string | null; email?: string | null };

function profileFromEmbedded(
  userId: string | null | undefined,
  embedded: PartialProfile | null | undefined,
): Profile {
  const email = embedded?.email ?? null;
  const loginId = todoProfileLoginId({ email });
  const contact = todoProfileContactEmail({ email });
  return {
    id: userId ?? embedded?.id ?? "",
    full_name: embedded?.full_name ?? loginId ?? contact ?? null,
    avatar_url: embedded?.avatar_url ?? null,
    email: contact || email,
    role: embedded?.role ?? "employee",
    updated_at: embedded?.updated_at ?? null,
  };
}

/** Resolve display profile — Hub-merged directory first, then embedded join fields. */
export function resolveTodoProfile(
  userId: string | null | undefined,
  embedded: PartialProfile | null | undefined,
  allUsers: Profile[],
): Profile {
  const fromDir = userId ? allUsers.find((u) => u.id === userId) : undefined;
  if (fromDir) {
    return {
      ...fromDir,
      avatar_url: embedded?.avatar_url ?? fromDir.avatar_url,
    };
  }

  if (embedded?.full_name) return embedded as Profile;
  if (embedded?.email) return profileFromEmbedded(userId, embedded);
  if (userId) {
    const byId = allUsers.find((u) => u.id === userId);
    if (byId) return byId;
  }
  return profileFromEmbedded(userId, embedded);
}

/** Short label for cards and headers — prefers Hub User ID. */
export function resolveTodoProfileLabel(
  userId: string | null | undefined,
  embedded: PartialProfile | null | undefined,
  allUsers: Profile[],
): string {
  return todoProfileDisplayLabel(resolveTodoProfile(userId, embedded, allUsers));
}
