import type { Profile } from "./types";

type PartialProfile = Partial<Profile> & { full_name?: string | null; email?: string | null };

/** Resolve display profile — embedded join first, then P0004 shared user directory. */
export function resolveTodoProfile(
  userId: string | null | undefined,
  embedded: PartialProfile | null | undefined,
  allUsers: Profile[],
): Profile {
  if (embedded?.full_name) return embedded as Profile;
  if (embedded?.email) {
    return {
      id: userId ?? embedded.id ?? "",
      full_name: embedded.full_name ?? embedded.email ?? null,
      avatar_url: embedded.avatar_url ?? null,
      email: embedded.email,
      role: embedded.role ?? "employee",
      updated_at: embedded.updated_at ?? null,
    };
  }
  if (userId) {
    const fromDir = allUsers.find((u) => u.id === userId);
    if (fromDir) return fromDir;
  }
  return {
    id: userId ?? "",
    full_name: embedded?.full_name ?? embedded?.email ?? null,
    avatar_url: embedded?.avatar_url ?? null,
    email: embedded?.email ?? null,
    role: embedded?.role ?? "employee",
    updated_at: embedded?.updated_at ?? null,
  };
}
