import { useEffect, useState } from "react";
import {
  getCachedNoteCookieMembers,
  prefetchNoteCookieMembers,
  subscribeNoteCookieMembersCache,
} from "./cookieRouteMembersPrefetch";

function readShareCount(noteId: string | null | undefined): number | undefined {
  const hit = getCachedNoteCookieMembers(noteId);
  return hit?.ok ? hit.members.length : undefined;
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
    if (prefetch) prefetchNoteCookieMembers(id);
    setShareCount((prev) => readShareCount(id) ?? prev);
  }, [id, prefetch]);

  useEffect(() => {
    if (!id) return;
    return subscribeNoteCookieMembersCache(() => {
      setShareCount((prev) => readShareCount(id) ?? prev);
    });
  }, [id]);

  return shareCount;
}
