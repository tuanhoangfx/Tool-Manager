import { useEffect, useState } from "react";
import {
  fetchNoteCookieMembers,
  getResolvedNoteCookieMembers,
  subscribeNoteCookieMembersCache,
} from "./cookieRouteMembersPrefetch";

function readShareCount(noteId: string | null | undefined): number | undefined {
  const hit = getResolvedNoteCookieMembers(noteId);
  if (!hit) return undefined;
  return hit.ok ? hit.members.length : 0;
}

type Options = {
  /** Warm members cache on mount (default true). */
  prefetch?: boolean;
};

/** Live share member count — cache + subscribe, shared by card / About / table. */
export function useCookieRouteShareCount(
  noteId: string | null | undefined,
  options: Options = {},
): number | undefined {
  const { prefetch = true } = options;
  const id = noteId?.trim() ?? "";

  const [shareCount, setShareCount] = useState<number | undefined>(() =>
    id ? readShareCount(id) : undefined,
  );

  useEffect(() => {
    if (!id) {
      setShareCount(undefined);
      return;
    }
    if (prefetch) void fetchNoteCookieMembers(id);
    setShareCount((prev) => readShareCount(id) ?? prev);
  }, [id, prefetch]);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeNoteCookieMembersCache(() => {
      setShareCount((prev) => readShareCount(id) ?? prev);
    });
    return () => {
      unsubscribe();
    };
  }, [id]);

  return shareCount;
}
