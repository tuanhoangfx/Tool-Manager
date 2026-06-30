import { sheetSourceDedupeKey, type SheetSource } from "./sheet-sources";

/** In-flight local deletes — prevents stale sync / realtime from restoring removed rows. */
const pendingDeleteIds = new Set<string>();
const pendingDeleteDedupeKeys = new Set<string>();
const pendingDeleteUntil = new Map<string, number>();
const pendingDeleteDedupeKeysById = new Map<string, string>();

const DEFAULT_MUTE_MS = 60_000;
const TOMBSTONE_STORAGE_KEY = "p0020:sheet:delete-tombstones:v1";
/** Keep tombstones until cloud confirms gone or this window elapses (re-delete on reconcile). */
const TOMBSTONE_MS = 7 * 24 * 60 * 60 * 1000;

type TombstoneRecord = { dedupeKey: string; markedAt: number; until: number; ids: string[] };

const tombstonesByKey = new Map<string, TombstoneRecord>();
let tombstonesHydrated = false;

function hydrateTombstones() {
  if (tombstonesHydrated) return;
  tombstonesHydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(TOMBSTONE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return;
    for (const row of parsed) {
      if (row && typeof row.dedupeKey === "string") {
        const ids = Array.isArray(row.ids)
          ? row.ids.filter((id: unknown): id is string => typeof id === "string")
          : [];
        tombstonesByKey.set(row.dedupeKey, { ...(row as TombstoneRecord), ids });
      }
    }
  } catch {
    /* ignore corrupt cache */
  }
}

function persistTombstones() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify([...tombstonesByKey.values()]));
  } catch {
    /* ignore quota */
  }
}

function loadTombstoneRecords(): Map<string, TombstoneRecord> {
  hydrateTombstones();
  return new Map(tombstonesByKey);
}

function saveTombstoneRecords(map: Map<string, TombstoneRecord>) {
  tombstonesByKey.clear();
  for (const [key, value] of map) tombstonesByKey.set(key, value);
  persistTombstones();
}

function pruneTombstones() {
  const now = Date.now();
  const map = loadTombstoneRecords();
  let changed = false;
  for (const [key, rec] of map) {
    if (now >= rec.until) {
      map.delete(key);
      changed = true;
    }
  }
  if (changed) saveTombstoneRecords(map);
}

function markTombstone(dedupeKey: string, id?: string) {
  const map = loadTombstoneRecords();
  const prev = map.get(dedupeKey);
  const ids = new Set(prev?.ids ?? []);
  if (id) ids.add(id);
  map.set(dedupeKey, {
    dedupeKey,
    markedAt: Date.now(),
    until: Date.now() + TOMBSTONE_MS,
    ids: [...ids],
  });
  saveTombstoneRecords(map);
}

function clearTombstone(dedupeKey: string) {
  const map = loadTombstoneRecords();
  if (map.delete(dedupeKey)) saveTombstoneRecords(map);
}

function isTombstonedDedupeKey(dedupeKey: string): boolean {
  pruneTombstones();
  return loadTombstoneRecords().has(dedupeKey);
}

function isTombstonedId(id: string): boolean {
  pruneTombstones();
  for (const rec of loadTombstoneRecords().values()) {
    if (rec.ids.includes(id)) return true;
  }
  return false;
}

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
  markTombstone(dedupeKey, source.id);
}

export function clearSheetPendingDelete(source: Pick<SheetSource, "id" | "rawUrl" | "gid" | "csvUrl">) {
  const dedupeKey = sheetSourceDedupeKey(source);
  pendingDeleteIds.delete(source.id);
  pendingDeleteDedupeKeys.delete(dedupeKey);
  pendingDeleteDedupeKeysById.delete(source.id);
  pendingDeleteUntil.delete(source.id);
  clearTombstone(dedupeKey);
}

export function clearSheetPendingDeleteByDedupeKey(dedupeKey: string) {
  pruneExpired();
  for (const [id, key] of pendingDeleteDedupeKeysById) {
    if (key === dedupeKey) {
      pendingDeleteIds.delete(id);
      pendingDeleteDedupeKeysById.delete(id);
      pendingDeleteUntil.delete(id);
    }
  }
  pendingDeleteDedupeKeys.delete(dedupeKey);
  clearTombstone(dedupeKey);
}

export function isSheetPendingDelete(source: Pick<SheetSource, "id" | "rawUrl" | "gid" | "csvUrl">): boolean {
  pruneExpired();
  pruneTombstones();
  const dedupeKey = sheetSourceDedupeKey(source);
  if (pendingDeleteIds.has(source.id) || pendingDeleteDedupeKeys.has(dedupeKey)) return true;
  if (isTombstonedId(source.id) || isTombstonedDedupeKey(dedupeKey)) return true;
  return false;
}

export function getSheetPendingDeleteIds(): ReadonlySet<string> {
  pruneExpired();
  return pendingDeleteIds;
}

export function filterSheetPendingDeletes<T extends Pick<SheetSource, "id" | "rawUrl" | "gid" | "csvUrl">>(rows: T[]): T[] {
  pruneExpired();
  pruneTombstones();
  if (!pendingDeleteIds.size && !pendingDeleteDedupeKeys.size && !loadTombstoneRecords().size) return rows;
  return rows.filter((row) => !isSheetPendingDelete(row));
}

/** Test helper — wipe RAM + persisted tombstones. */
export function resetSheetPendingDeletesForTests() {
  pendingDeleteIds.clear();
  pendingDeleteDedupeKeys.clear();
  pendingDeleteUntil.clear();
  pendingDeleteDedupeKeysById.clear();
  tombstonesByKey.clear();
  tombstonesHydrated = false;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(TOMBSTONE_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
