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

export function useSheetSourcesCloud(
  session: Session | null,
  tabActive: boolean,
  onSources: (sources: ReturnType<typeof loadSheetSources>) => void,
) {
  const userId = session?.user?.id ?? null;
  const syncingRef = useRef(false);
  const pushTimerRef = useRef<number | null>(null);
  const onSourcesRef = useRef(onSources);

  useEffect(() => {
    onSourcesRef.current = onSources;
  }, [onSources]);

  useEffect(() => {
    if (!tabActive || !userId || !isSheetSourcesCloudAvailable()) return;
    let cancelled = false;
    syncingRef.current = true;
    void syncSheetSourcesWithCloud(userId)
      .then((next) => {
        if (!cancelled) onSourcesRef.current(next);
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
      syncingRef.current = true;
      void reconcileSheetSourcesFromCloud(userId)
        .then((next) => onSourcesRef.current(next))
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
      if (syncingRef.current) return;
      const detail = (event as CustomEvent<SheetSourcesChangeDetail>).detail;
      if (!detail) return;
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
      pushTimerRef.current = window.setTimeout(() => {
        void (async () => {
          syncingRef.current = true;
          try {
            if (detail.action === "delete" && detail.source) {
              await deleteSheetSourceFromCloud(detail.source, userId);
            } else if (detail.source) {
              await pushSheetSourceToCloud(detail.source, userId);
              onSourcesRef.current(loadSheetSources());
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
