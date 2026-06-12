import {
  listNoteCookieMembers,
  type NoteCookieMemberRow,
} from "./noteCookieMembersRepository";

type MembersResult =
  | { ok: true; members: NoteCookieMemberRow[] }
  | { ok: false; error: string };

const inflight = new Map<string, Promise<MembersResult>>();
const resolved = new Map<string, MembersResult>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Listener errors must not break cache writes.
    }
  });
}

function cacheResult(noteId: string, result: MembersResult) {
  const prev = resolved.get(noteId);
  if (!result.ok && prev?.ok) return;
  resolved.set(noteId, result);
  notifyListeners();
}

/** Subscribe to members cache writes — keeps share aggregates realtime without stale UI. */
export function subscribeNoteCookieMembersCache(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

type FetchMembersOpts = { refresh?: boolean };

/** Single deduped members fetch — used by prefetch, batch counts, and detail modal. */
export function fetchNoteCookieMembers(
  noteId: string | null | undefined,
  opts?: FetchMembersOpts,
): Promise<MembersResult> {
  const id = noteId?.trim();
  if (!id) return Promise.resolve({ ok: false, error: "note_id_required" });

  if (opts?.refresh) {
    resolved.delete(id);
    inflight.delete(id);
  }

  const hit = resolved.get(id);
  if (hit) return Promise.resolve(hit);

  const pending = inflight.get(id);
  if (pending) return pending;

  const promise = listNoteCookieMembers(id)
    .then((result) => {
      cacheResult(id, result);
      return result;
    })
    .finally(() => {
      inflight.delete(id);
    });
  inflight.set(id, promise);
  return promise;
}

/** Warm members list on route card hover — route detail opens with data ready. */
export function prefetchNoteCookieMembers(noteId: string | null | undefined) {
  void fetchNoteCookieMembers(noteId);
}

/** Any settled cache entry — used for share count (failed → treat as private). */
export function getResolvedNoteCookieMembers(noteId: string | null | undefined): MembersResult | undefined {
  const id = noteId?.trim();
  if (!id) return undefined;
  return resolved.get(id);
}

/** Synchronous hit after hover prefetch or prior detail open. */
export function getCachedNoteCookieMembers(noteId: string | null | undefined): MembersResult | undefined {
  const hit = getResolvedNoteCookieMembers(noteId);
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
  notifyListeners();
}

/** Warm many routes when directory list loads (share counts + detail open). */
export function prefetchNoteCookieMembersBatch(noteIds: readonly string[]) {
  for (const noteId of noteIds) prefetchNoteCookieMembers(noteId);
}

/** @deprecated Use {@link fetchNoteCookieMembers} */
export function takePrefetchedNoteCookieMembers(noteId: string): Promise<MembersResult> {
  return fetchNoteCookieMembers(noteId);
}
