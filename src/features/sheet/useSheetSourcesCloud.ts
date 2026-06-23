import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import type { SheetSourcesChangeDetail } from "./sheet-sources";
import { loadSheetSources, SHEET_SOURCES_CHANGE_EVENT } from "./sheet-sources";
import {
  deleteSheetSourceFromCloud,
  isSheetSourcesCloudAvailable,
  pushSheetSourceToCloud,
  reconcileSheetSourcesFromCloud,
  syncSheetSourcesWithCloud,
} from "./sheet-sources-cloud";
import { addSheetSourcesRealtimeListener } from "./sheet-sources-realtime-hub";
import { filterSheetPendingDeletes } from "./sheet-sync-pending";

function applyCloudSources(
  onSources: (sources: ReturnType<typeof loadSheetSources>) => void,
  next: ReturnType<typeof loadSheetSources>,
) {
  onSources(filterSheetPendingDeletes(next));
}

export function useSheetSourcesCloud(
  session: Session | null,
  tabActive: boolean,
  onSources: (sources: ReturnType<typeof loadSheetSources>) => void,
) {
  const userId = session?.user?.id ?? null;
  const syncingRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);
  const onSourcesRef = useRef(onSources);
  const syncGeneration = useRef(0);

  useEffect(() => {
    onSourcesRef.current = onSources;
  }, [onSources]);

  useEffect(() => {
    if (!tabActive || !userId || !isSheetSourcesCloudAvailable()) return;
    let cancelled = false;
    const generation = syncGeneration.current;
    syncingRef.current = true;
    void syncSheetSourcesWithCloud(userId)
      .then((next) => {
        if (!cancelled && generation === syncGeneration.current) {
          applyCloudSources(onSourcesRef.current, next);
        }
      })
      .catch(() => {
        /* keep local cache on sync failure */
      })
      .finally(() => {
        syncingRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [tabActive, userId]);

  useEffect(() => {
    if (!tabActive || !userId || !isSheetSourcesCloudAvailable()) return;

    return addSheetSourcesRealtimeListener(userId, () => {
      if (syncingRef.current) return;
      const generation = syncGeneration.current;
      syncingRef.current = true;
      void reconcileSheetSourcesFromCloud(userId)
        .then((next) => {
          if (generation === syncGeneration.current) {
            applyCloudSources(onSourcesRef.current, next);
          }
        })
        .catch(() => {
          /* keep local cache */
        })
        .finally(() => {
          syncingRef.current = false;
        });
    });
  }, [tabActive, userId]);

  useEffect(() => {
    if (!userId || !isSheetSourcesCloudAvailable()) return;

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<SheetSourcesChangeDetail>).detail;
      if (!detail) return;
      if (detail.action === "delete") syncGeneration.current += 1;
      if (syncingRef.current) return;
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = window.setTimeout(() => {
        void (async () => {
          syncingRef.current = true;
          try {
            if (detail.action === "delete" && detail.source) {
              await deleteSheetSourceFromCloud(detail.source, userId);
            } else if (detail.source) {
              await pushSheetSourceToCloud(detail.source, userId);
              applyCloudSources(onSourcesRef.current, loadSheetSources());
            }
          } catch {
            /* offline — local cache remains */
          } finally {
            syncingRef.current = false;
          }
        })();
      }, 400);
    };

    window.addEventListener(SHEET_SOURCES_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener(SHEET_SOURCES_CHANGE_EVENT, onChange);
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [userId]);
}
