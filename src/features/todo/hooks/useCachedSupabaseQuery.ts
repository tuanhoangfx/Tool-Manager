
import { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { DataChange } from '../app-types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function useCachedSupabaseQuery<T>({
  cacheKey,
  query,
  dependencies = [],
  lastDataChange,
  filter,
}: {
  cacheKey: string;
  query: () => Promise<{ data: T | null; error: any }>;
  dependencies?: any[];
  lastDataChange: DataChange | null;
  filter?: (item: any) => boolean;
}) {
  const [cachedData, setCachedData] = useLocalStorage<CacheEntry<T> | null>(cacheKey, null);
  const [data, setData] = useState<T | null>(cachedData?.data ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    setError(null);

    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempts < maxAttempts && !success) {
      try {
        const { data: freshData, error: queryError } = await query();
        if (queryError) throw queryError;
        
        setData(freshData as T);
        setCachedData({ data: freshData as T, timestamp: Date.now() });
        success = true;
      } catch (err: any) {
        attempts++;
        // Only retry on network errors (fetch failures) or specifically explicitly transient errors
        const isNetworkError = err.message === 'Failed to fetch' || err.message.includes('NetworkError');
        const errorMessage = err.message || JSON.stringify(err);
        
        if (attempts >= maxAttempts || !isNetworkError) {
          console.error(`Error fetching data for ${cacheKey}:`, errorMessage);
          setError(err);
          if (!cachedData?.data) {
            setData(null);
          }
        } else {
          // Exponential backoff: 500, 1000, 2000 ms
          await wait(500 * Math.pow(2, attempts - 1));
        }
      }
    }

    if (!isBackgroundRefresh) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ...dependencies]);

  // Effect for initial load and when main dependencies change
  useEffect(() => {
    const isCacheStale = !cachedData || (Date.now() - cachedData.timestamp > CACHE_DURATION);

    if (isCacheStale || !cachedData?.data) {
      fetchData(false);
    } else {
      setData(cachedData.data);
      setLoading(false);
      fetchData(true); // Background refresh for freshness
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  // Effect for handling real-time data changes from subscriptions
  useEffect(() => {
    if (!lastDataChange || loading) {
      return;
    }
    
    const currentData = data;
    const isArrayOfObjects = (d: any): d is { id: any }[] => Array.isArray(d);

    if (!isArrayOfObjects(currentData) && lastDataChange.type !== 'batch_update') {
      fetchData(true);
      return;
    }

    const updateAndCache = (newData: T) => {
      setData(newData);
      setCachedData({ data: newData, timestamp: Date.now() });
    };

    // Helper to check if item passes the provided filter
    const passesFilter = (item: any) => {
        return filter ? filter(item) : true;
    };

    switch (lastDataChange.type) {
      case 'add': {
        const payload = lastDataChange.payload as { id?: number };
        if(isArrayOfObjects(currentData)) {
            if (passesFilter(lastDataChange.payload)) {
                if (!currentData.find(item => item.id === payload.id)) {
                    updateAndCache([...currentData, lastDataChange.payload] as unknown as T);
                }
            }
        }
        break;
      }
      case 'update': {
        if(isArrayOfObjects(currentData)) {
            const payload = lastDataChange.payload as { id?: number };
            const isMatch = passesFilter(payload);
            let itemFound = false;

            // If the updated item matches the filter, update it or add it
            if (isMatch) {
                const updatedData = currentData.map(item => {
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
                // If it NO LONGER matches the filter (e.g. unassigned), remove it
                const filteredData = currentData.filter(item => item.id !== payload.id);
                if (filteredData.length !== currentData.length) {
                    updateAndCache(filteredData as unknown as T);
                }
            }
        }
        break;
      }
      case 'delete': {
        const payload = lastDataChange.payload as { id?: number };
        if(isArrayOfObjects(currentData)) {
            updateAndCache(currentData.filter(item => item.id !== payload.id) as unknown as T);
        }
        break;
      }
      case 'delete_many': {
        const payload = lastDataChange.payload as { ids?: number[] };
        if(isArrayOfObjects(currentData)) {
            const idsToDelete = new Set(payload.ids ?? []);
            updateAndCache(currentData.filter(item => !idsToDelete.has(item.id)) as unknown as T);
        }
        break;
      }
      default:
        // For batch_update or unknown types, fall back to a full refetch
        fetchData(true);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDataChange, filter]); // Added filter to dependencies

  // Refetch on window focus to ensure data freshness
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchData]);


  return { data, loading, error };
}
