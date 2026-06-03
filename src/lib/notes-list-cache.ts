import { createClientCache, type ClientCache } from "@dev/hub-load";
import type { NoteRow } from "../features/notes/types";

const LEGACY_KEY = "p0020:notes:list:v1";
const cacheByUser = new Map<string, ClientCache<NoteRow[]>>();

function notesListCacheKey(userId: string) {
  return `p0020:notes:list:v2:${userId}`;
}

function getCache(userId: string): ClientCache<NoteRow[]> {
  let cache = cacheByUser.get(userId);
  if (!cache) {
    cache = createClientCache<NoteRow[]>({
      key: notesListCacheKey(userId),
      ttlMs: 3 * 60_000,
      validate: (data): data is NoteRow[] =>
        Array.isArray(data) && data.every((r) => typeof r === "object" && r != null && "id" in r),
    });
    cacheByUser.set(userId, cache);
  }
  return cache;
}

/** Drop pre–user-scoped list cache (could show another account's notes). */
export function clearLegacyNotesListCache() {
  if (typeof window === "undefined") return;
  for (const store of [sessionStorage, localStorage]) {
    try {
      store.removeItem(LEGACY_KEY);
    } catch {
      /* private mode */
    }
  }
}

export function readNotesListStaleCache(userId: string | null | undefined): NoteRow[] | null {
  if (!userId) return null;
  clearLegacyNotesListCache();
  const rows = getCache(userId).readStale();
  if (!rows?.length) return rows;
  const owned = rows.filter((r) => r.user_id === userId);
  return owned.length === rows.length ? rows : owned.length ? owned : null;
}

export function writeNotesListClientCache(userId: string, rows: NoteRow[]) {
  if (!userId) return;
  getCache(userId).write(rows);
}

export function clearNotesListClientCache(userId: string) {
  getCache(userId).clear();
}
