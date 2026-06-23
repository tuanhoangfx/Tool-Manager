import { sheetSourceDedupeKey, type SheetSource } from "./sheet-sources";

/** In-flight local deletes — prevents stale sync / realtime from restoring removed rows. */
const pendingDeleteIds = new Set<string>();
const pendingDeleteDedupeKeys = new Set<string>();
const pendingDeleteUntil = new Map<string, number>();
const pendingDeleteDedupeKeysById = new Map<string, string>();

const DEFAULT_MUTE_MS = 8000;

function pruneExpired() {
  const now = Date.now();
  for (const [id, until] of pendingDeleteUntil) {
    if (now >= until) {
      pendingDeleteUntil.delete(id);
      pendingDeleteIds.delete(id);
      const key = pendingDeleteDedupeKeysById.get(id);
      if (key) {
        pendingDeleteDedupeKeys.delete(key);
        pendingDeleteDedupeKeysById.delete(id);
      }
    }
  }
}

export function markSheetPendingDelete(source: Pick<SheetSource, "id" | "rawUrl" | "gid" | "csvUrl">, muteMs = DEFAULT_MUTE_MS) {
  const dedupeKey = sheetSourceDedupeKey(source);
  pendingDeleteIds.add(source.id);
  pendingDeleteDedupeKeys.add(dedupeKey);
  pendingDeleteDedupeKeysById.set(source.id, dedupeKey);
  pendingDeleteUntil.set(source.id, Date.now() + muteMs);
}

export function clearSheetPendingDelete(source: Pick<SheetSource, "id" | "rawUrl" | "gid" | "csvUrl">) {
  const dedupeKey = sheetSourceDedupeKey(source);
  pendingDeleteIds.delete(source.id);
  pendingDeleteDedupeKeys.delete(dedupeKey);
  pendingDeleteDedupeKeysById.delete(source.id);
  pendingDeleteUntil.delete(source.id);
}

export function isSheetPendingDelete(source: Pick<SheetSource, "id" | "rawUrl" | "gid" | "csvUrl">): boolean {
  pruneExpired();
  return pendingDeleteIds.has(source.id) || pendingDeleteDedupeKeys.has(sheetSourceDedupeKey(source));
}

export function getSheetPendingDeleteIds(): ReadonlySet<string> {
  pruneExpired();
  return pendingDeleteIds;
}

export function filterSheetPendingDeletes<T extends Pick<SheetSource, "id" | "rawUrl" | "gid" | "csvUrl">>(rows: T[]): T[] {
  pruneExpired();
  if (!pendingDeleteIds.size && !pendingDeleteDedupeKeys.size) return rows;
  return rows.filter((row) => !isSheetPendingDelete(row));
}
