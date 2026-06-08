import {
  listNoteCookieMembers,
  type NoteCookieMemberRow,
} from "./noteCookieMembersRepository";

type MembersResult =
  | { ok: true; members: NoteCookieMemberRow[] }
  | { ok: false; error: string };

const inflight = new Map<string, Promise<MembersResult>>();
const resolved = new Map<string, MembersResult>();

function cacheResult(noteId: string, result: MembersResult) {
  resolved.set(noteId, result);
}

/** Warm members list on route card hover — route detail opens with data ready. */
export function prefetchNoteCookieMembers(noteId: string | null | undefined) {
  const id = noteId?.trim();
  if (!id || inflight.has(id)) return;
  if (resolved.get(id)?.ok) return;
  const pending = listNoteCookieMembers(id).then((result) => {
    cacheResult(id, result);
    return result;
  });
  inflight.set(id, pending);
}

/** Synchronous hit after hover prefetch or prior detail open. */
export function getCachedNoteCookieMembers(noteId: string | null | undefined): MembersResult | undefined {
  const id = noteId?.trim();
  if (!id) return undefined;
  const hit = resolved.get(id);
  return hit?.ok ? hit : undefined;
}

export function rememberNoteCookieMembers(noteId: string, result: MembersResult) {
  cacheResult(noteId.trim(), result);
}

export function invalidateNoteCookieMembersCache(noteId: string | null | undefined) {
  const id = noteId?.trim();
  if (!id) return;
  resolved.delete(id);
  inflight.delete(id);
}

/** Warm many routes when directory list loads (share counts + detail open). */
export function prefetchNoteCookieMembersBatch(noteIds: readonly string[]) {
  for (const noteId of noteIds) prefetchNoteCookieMembers(noteId);
}
export function takePrefetchedNoteCookieMembers(noteId: string): Promise<MembersResult> | undefined {
  const id = noteId.trim();
  const pending = inflight.get(id);
  if (pending) {
    inflight.delete(id);
    return pending;
  }
  const hit = resolved.get(id);
  if (hit?.ok) return Promise.resolve(hit);
  return undefined;
}
