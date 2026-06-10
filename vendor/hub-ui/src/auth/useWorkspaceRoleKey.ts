import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HubSessionLike } from "@tool-workspace/hub-identity";
import {
  fetchWorkspaceProfileRole,
  readCachedWorkspaceProfileRole,
  subscribeWorkspaceProfileRole,
} from "../lib/workspace-profile-role";
import { normalizeWorkspaceRoleKey, resolveWorkspaceRoleKey } from "./hub-workspace-role-icon";

export type UseWorkspaceRoleKeyOptions = {
  anonymous?: boolean;
  /** Controlled role key — skips session + async resolve. */
  roleKey?: string;
  /** Fetch profiles.role (legacy callback — prefer profileRoleClient). */
  onResolveRoleKey?: (userId: string) => Promise<string | null | undefined>;
  /** Supabase client — fetch + realtime `profiles.role` (Hub Users SSOT). */
  profileRoleClient?: SupabaseClient | null;
};

export type WorkspaceRoleState = {
  roleKey: string;
  /** Hide role icon until profiles.role resolves — avoids JWT "user" flash. */
  roleIconPending: boolean;
};

/** Sidebar footer role icon — profiles.role SSOT with optional realtime sync. */
export function useWorkspaceRoleKey(
  session: HubSessionLike,
  opts: UseWorkspaceRoleKeyOptions = {},
): WorkspaceRoleState {
  const { anonymous = false, roleKey: roleKeyProp, onResolveRoleKey, profileRoleClient } = opts;
  const userId = session?.user?.id;
  const usesProfileSsot = Boolean(profileRoleClient && userId);
  const sessionRoleKey = anonymous ? "anonymous" : resolveWorkspaceRoleKey(session);
  const initialCached = userId ? readCachedWorkspaceProfileRole(userId) : null;

  const [resolvedRoleKey, setResolvedRoleKey] = useState<string | null>(initialCached);
  const [roleIconPending, setRoleIconPending] = useState(() => usesProfileSsot && !initialCached);

  useEffect(() => {
    if (roleKeyProp) {
      setResolvedRoleKey(null);
      setRoleIconPending(false);
      return;
    }
    if (anonymous || !userId) {
      setResolvedRoleKey(null);
      setRoleIconPending(false);
      return;
    }

    let cancelled = false;
    const cached = profileRoleClient ? readCachedWorkspaceProfileRole(userId) : null;
    setResolvedRoleKey(cached);
    setRoleIconPending(Boolean(profileRoleClient && !cached));

    const applyRole = (role: string | null | undefined) => {
      if (!cancelled && role) {
        setResolvedRoleKey(normalizeWorkspaceRoleKey(role));
        setRoleIconPending(false);
      }
    };

    if (profileRoleClient) {
      const load = () => {
        void fetchWorkspaceProfileRole(profileRoleClient, userId).then((role) => {
          applyRole(role);
          if (!cancelled) setRoleIconPending(false);
        });
      };
      load();
      const unsubscribeRole = subscribeWorkspaceProfileRole(profileRoleClient, userId, applyRole);
      const {
        data: { subscription },
      } = profileRoleClient.auth.onAuthStateChange(() => {
        load();
      });
      return () => {
        cancelled = true;
        unsubscribeRole();
        subscription.unsubscribe();
      };
    }

    if (!onResolveRoleKey) return;

    void onResolveRoleKey(userId).then(applyRole);
    return () => {
      cancelled = true;
    };
  }, [anonymous, onResolveRoleKey, profileRoleClient, roleKeyProp, userId]);

  if (roleKeyProp) {
    return { roleKey: normalizeWorkspaceRoleKey(roleKeyProp), roleIconPending: false };
  }
  if (anonymous) {
    return { roleKey: "anonymous", roleIconPending: false };
  }
  if (usesProfileSsot) {
    if (resolvedRoleKey) {
      return { roleKey: resolvedRoleKey, roleIconPending: false };
    }
    if (roleIconPending) {
      return { roleKey: sessionRoleKey, roleIconPending: true };
    }
  }
  return { roleKey: resolvedRoleKey ?? sessionRoleKey, roleIconPending: false };
}
