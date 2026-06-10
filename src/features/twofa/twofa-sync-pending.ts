/** In-flight local deletes — prevents stale sync / push from restoring tombstoned rows. */
const pendingDeleteIds = new Set<string>();
const pendingDeleteUntil = new Map<string, number>();

const DEFAULT_MUTE_MS = 8000;

function pruneExpired() {
  const now = Date.now();
  for (const [id, until] of pendingDeleteUntil) {
    if (now >= until) {
      pendingDeleteUntil.delete(id);
      pendingDeleteIds.delete(id);
    }
  }
}

export function markTwofaPendingDelete(id: string, muteMs = DEFAULT_MUTE_MS) {
  pendingDeleteIds.add(id);
  pendingDeleteUntil.set(id, Date.now() + muteMs);
}

export function clearTwofaPendingDelete(id: string) {
  pendingDeleteIds.delete(id);
  pendingDeleteUntil.delete(id);
}

export function isTwofaPendingDelete(id: string): boolean {
  pruneExpired();
  return pendingDeleteIds.has(id);
}

export function getTwofaPendingDeleteIds(): ReadonlySet<string> {
  pruneExpired();
  return pendingDeleteIds;
}

export function filterTwofaPendingDeletes<T extends { id: string }>(rows: T[]): T[] {
  const pending = getTwofaPendingDeleteIds();
  if (!pending.size) return rows;
  return rows.filter((row) => !pending.has(row.id));
}
