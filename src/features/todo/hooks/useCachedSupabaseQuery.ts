import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { DataChange } from "../app-types";
import { createTodoQueryCache, migrateLegacyQueryCache } from "../lib/createTodoQueryCache";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useCachedSupabaseQuery<T>({
  cacheKey,
  query,
  dependencies = [],
  lastDataChange,
  filter,
  enabled = true,
}: {
  cacheKey: string;
  query: () => Promise<{ data: T | null; error: unknown }>;
  dependencies?: unknown[];
  lastDataChange: DataChange | null;
  filter?: (item: unknown) => boolean;
  enabled?: boolean;
}) {
  const cache = useMemo(() => createTodoQueryCache<T>(cacheKey), [cacheKey]);
  const migratedRef = useRef(false);

  if (!migratedRef.current) {
    migrateLegacyQueryCache(cache, cacheKey);
    migratedRef.current = true;
  }

  const readCached = () => cache.readStale();
  const [data, setData] = useState<T | null>(() => readCached());
  const [loading, setLoading] = useState(() => enabled && readCached() == null);
  const [error, setError] = useState<unknown>(null);

  const writeCache = useCallback(
    (next: T) => {
      cache.write(next);
    },
    [cache],
  );

  const fetchData = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!enabled) return;
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);

      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      const stale = readCached();

      while (attempts < maxAttempts && !success) {
        try {
          const { data: freshData, error: queryError } = await query();
          if (queryError) throw queryError;

          setData(freshData as T);
          writeCache(freshData as T);
          success = true;
        } catch (err: unknown) {
          attempts++;
          const message = err instanceof Error ? err.message : String(err);
          const isNetworkError =
            message === "Failed to fetch" || message.includes("NetworkError");

          if (attempts >= maxAttempts || !isNetworkError) {
            console.error(`Error fetching data for ${cacheKey}:`, message);
            setError(err);
            if (!stale) {
              setData(null);
            }
          } else {
            await wait(500 * 2 ** (attempts - 1));
          }
        }
      }

      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, enabled, writeCache, ...dependencies],
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const fresh = cache.readFresh();
    const stale = cache.readStale();

    if (!fresh || stale == null) {
      void fetchData(false);
      return;
    }

    setData(stale);
    setLoading(false);
    void fetchData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, enabled]);

  useEffect(() => {
    if (!enabled || !lastDataChange || loading) {
      return;
    }

    const currentData = data;
    const isArrayOfObjects = (d: unknown): d is { id: unknown }[] => Array.isArray(d);

    if (!isArrayOfObjects(currentData) && lastDataChange.type !== "batch_update") {
      void fetchData(true);
      return;
    }

    const updateAndCache = (newData: T) => {
      setData(newData);
      writeCache(newData);
    };

    const passesFilter = (item: unknown) => (filter ? filter(item) : true);

    switch (lastDataChange.type) {
      case "add": {
        const payload = lastDataChange.payload as { id?: unknown };
        if (isArrayOfObjects(currentData)) {
          if (passesFilter(lastDataChange.payload)) {
            if (!currentData.find((item) => item.id === payload.id)) {
              updateAndCache([...currentData, lastDataChange.payload] as unknown as T);
            }
          }
        }
        break;
      }
      case "update": {
        if (isArrayOfObjects(currentData)) {
          const payload = lastDataChange.payload as { id?: unknown };
          const isMatch = passesFilter(payload);
          let itemFound = false;

          if (isMatch) {
            const updatedData = currentData.map((item) => {
              if (item.id === payload.id) {
                itemFound = true;
                return payload;
              }
              return item;
            });

            if (!itemFound) {
              updatedData.push(payload);
            }
            updateAndCache(updatedData as unknown as T);
          } else {
            const filteredData = currentData.filter((item) => item.id !== payload.id);
            if (filteredData.length !== currentData.length) {
              updateAndCache(filteredData as unknown as T);
            }
          }
        }
        break;
      }
      case "delete": {
        const payload = lastDataChange.payload as { id?: unknown };
        if (isArrayOfObjects(currentData)) {
          updateAndCache(currentData.filter((item) => item.id !== payload.id) as unknown as T);
        }
        break;
      }
      case "delete_many": {
        const payload = lastDataChange.payload as { ids?: unknown[] };
        if (isArrayOfObjects(currentData)) {
          const idsToDelete = new Set(payload.ids ?? []);
          updateAndCache(
            currentData.filter((item) => !idsToDelete.has(item.id)) as unknown as T,
          );
        }
        break;
      }
      default:
        void fetchData(true);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, lastDataChange, filter]);

  useEffect(() => {
    if (!enabled) return;

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        void fetchData(true);
      }
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("visibilitychange", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, fetchData]);

  return { data, loading, error };
}
