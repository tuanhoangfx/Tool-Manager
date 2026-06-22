import type { TwofaAccount } from "./types";

/** In-flight local deletes — prevents stale sync / push from restoring tombstoned rows. */
const pendingDeleteIds = new Set<string>();
const pendingDeleteUntil = new Map<string, number>();

/** In-flight local edits — prevents realtime/self-sync from restoring pre-save cloud rows. */
const pendingEditSnapshots = new Map<string, { snapshot: TwofaAccount; until: number }>();

const DEFAULT_MUTE_MS = 8000;
const DEFAULT_EDIT_MUTE_MS = 20000;

function pruneExpired() {
  const now = Date.now();
  for (const [id, until] of pendingDeleteUntil) {
    if (now >= until) {
      pendingDeleteUntil.delete(id);
      pendingDeleteIds.delete(id);
    }
  }
  for (const [id, entry] of pendingEditSnapshots) {
    if (now >= entry.until) pendingEditSnapshots.delete(id);
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

export function markTwofaPendingEdit(snapshot: TwofaAccount, muteMs = DEFAULT_EDIT_MUTE_MS) {
  pendingEditSnapshots.set(snapshot.id, { snapshot, until: Date.now() + muteMs });
}

export function clearTwofaPendingEdit(id: string) {
  pendingEditSnapshots.delete(id);
}

export function retargetTwofaPendingEdit(localId: string, cloudId: string, snapshot?: TwofaAccount) {
  const entry = pendingEditSnapshots.get(localId);
  if (!entry) return;
  pendingEditSnapshots.delete(localId);
  const next = snapshot ?? { ...entry.snapshot, id: cloudId };
  pendingEditSnapshots.set(cloudId, { ...entry, snapshot: next });
}

/** Overlay in-flight local edits after cloud merge — local snapshot wins until ack or expiry. */
export function applyTwofaPendingEdits(rows: TwofaAccount[]): TwofaAccount[] {
  pruneExpired();
  if (!pendingEditSnapshots.size) return rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const [id, entry] of pendingEditSnapshots) {
    const current = byId.get(id);
    if (!current || Date.parse(entry.snapshot.updatedAt) >= Date.parse(current.updatedAt)) {
      byId.set(id, entry.snapshot);
    }
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.service.localeCompare(b.service),
  );
}
