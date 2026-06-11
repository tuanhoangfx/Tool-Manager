import { createClientCache, type ClientCache } from "@dev/hub-load";

export const TODO_QUERY_CACHE_TTL_MS = 5 * 60 * 1000;

/** Hub-load client cache for Todo Supabase queries (localStorage, SWR). */
export function createTodoQueryCache<T>(key: string, ttlMs = TODO_QUERY_CACHE_TTL_MS): ClientCache<T> {
  return createClientCache<T>({ key, ttlMs, persistLocal: true });
}

/** One-time migrate legacy `{ data, timestamp }` → hub-load `{ at, data }`. */
export function migrateLegacyQueryCache<T>(cache: ClientCache<T>, key: string): void {
  if (typeof window === "undefined" || cache.readStale() != null) return;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { data?: T; timestamp?: number; at?: number };
    if (parsed?.data !== undefined && parsed.timestamp != null && parsed.at == null) {
      cache.write(parsed.data);
    }
  } catch {
    /* corrupt entry */
  }
}
