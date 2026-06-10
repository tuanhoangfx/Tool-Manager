import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeWorkspaceRoleKey, type HubWorkspaceRoleKey } from "../auth/hub-workspace-role-icon";

const ROLE_CACHE_KEY = "hub:workspace-profile-role";

function parseRoleCache(raw: string | null, userId: string): HubWorkspaceRoleKey | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { userId?: string; role?: string };
    if (parsed.userId !== userId || !parsed.role) return null;
    return normalizeWorkspaceRoleKey(parsed.role);
  } catch {
    return null;
  }
}

function readRoleCache(userId: string): HubWorkspaceRoleKey | null {
  if (typeof window === "undefined") return null;
  return (
    parseRoleCache(window.sessionStorage.getItem(ROLE_CACHE_KEY), userId) ??
    parseRoleCache(window.localStorage.getItem(ROLE_CACHE_KEY), userId)
  );
}

function writeRoleCache(userId: string, role: HubWorkspaceRoleKey): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ userId, role });
  try {
    window.sessionStorage.setItem(ROLE_CACHE_KEY, payload);
    window.localStorage.setItem(ROLE_CACHE_KEY, payload);
  } catch {
    /* ignore quota */
  }
}

/** Fetch workspace role from shared `profiles` table (Hub Users SSOT). */
export async function fetchWorkspaceProfileRole(
  client: SupabaseClient,
  userId: string,
): Promise<HubWorkspaceRoleKey | null> {
  const cached = readRoleCache(userId);
  await client.auth.getSession();

  const { data, error } = await client.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!error && data?.role) {
    const role = normalizeWorkspaceRoleKey(String(data.role));
    writeRoleCache(userId, role);
    return role;
  }

  const directory = await client.rpc("workspace_user_directory");
  if (!directory.error && Array.isArray(directory.data)) {
    const row = (directory.data as { id?: string; role?: string | null }[]).find((r) => r.id === userId);
    if (row?.role) {
      const role = normalizeWorkspaceRoleKey(String(row.role));
      writeRoleCache(userId, role);
      return role;
    }
  }

  return cached;
}

/** Live `profiles.role` updates — sidebar icon stays in sync after admin edits. */
export function subscribeWorkspaceProfileRole(
  client: SupabaseClient,
  userId: string,
  onRole: (role: HubWorkspaceRoleKey) => void,
): () => void {
  const channel = client
    .channel(`hub-profile-role:${userId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
      (payload) => {
        const next = (payload.new as { role?: string | null } | undefined)?.role;
        if (next) {
          const role = normalizeWorkspaceRoleKey(next);
          writeRoleCache(userId, role);
          onRole(role);
        }
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/** Seed sidebar icon before async fetch (same-tab sessionStorage). */
export function readCachedWorkspaceProfileRole(userId: string): HubWorkspaceRoleKey | null {
  return readRoleCache(userId);
}

/** Write role cache when directory/modal resolves role (Users tab SSOT). */
export function cacheWorkspaceProfileRole(userId: string, role: string): void {
  writeRoleCache(userId, normalizeWorkspaceRoleKey(role));
}
