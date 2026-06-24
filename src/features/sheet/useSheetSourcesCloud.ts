import { useCallback, useEffect, useRef } from "react";
import { useCrossTabVaultReload } from "@dev/hub-load";
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
import {
  postSheetSourcesCrossTab,
  SHEET_SOURCES_CHANNEL,
  sheetSourcesStorageMatcher,
} from "./sheet-sources-cross-tab";
import { filterSheetPendingDeletes, isSheetPendingDelete } from "./sheet-sync-pending";
import { useSheetRealtime } from "./useSheetRealtime";

const CROSS_TAB_RELOAD_DEBOUNCE_MS = 120;
const FOCUS_RECONCILE_MIN_MS = 5 * 60_000;
const CLOUD_PUSH_DEBOUNCE_MS = 400;

export function mergeQueuedSheetChanges(
  queue: SheetSourcesChangeDetail[],
  next: SheetSourcesChangeDetail,
): SheetSourcesChangeDetail[] {
  const out = queue.filter((item) => item.sourceId !== next.sourceId);
  out.push(next);
  return out;
}

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
  const queuedChangesRef = useRef<SheetSourcesChangeDetail[]>([]);
  const drainQueuedChangesRef = useRef<(() => void) | null>(null);
  const pendingReconcileRef = useRef(false);
  const lastFocusReconcileRef = useRef(0);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    onSourcesRef.current = onSources;
  }, [onSources]);

  const finishSyncCycle = useCallback(() => {
    syncingRef.current = false;
    drainQueuedChangesRef.current?.();
    const uid = userIdRef.current;
    if (!pendingReconcileRef.current || !uid || !isSheetSourcesCloudAvailable()) return;
    pendingReconcileRef.current = false;
    const generation = syncGeneration.current;
    syncingRef.current = true;
    void reconcileSheetSourcesFromCloud(uid)
      .then((next) => {
        if (generation === syncGeneration.current) {
          applyCloudSources(onSourcesRef.current, next);
          postSheetSourcesCrossTab("cloud-synced");
        }
      })
      .catch(() => {
        /* keep local cache */
      })
      .finally(() => {
        syncingRef.current = false;
        drainQueuedChangesRef.current?.();
      });
  }, []);

  const requestReconcile = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid || !isSheetSourcesCloudAvailable()) return;
    if (syncingRef.current) {
      pendingReconcileRef.current = true;
      return;
    }
    const generation = syncGeneration.current;
    syncingRef.current = true;
    void reconcileSheetSourcesFromCloud(uid)
      .then((next) => {
        if (generation === syncGeneration.current) {
          applyCloudSources(onSourcesRef.current, next);
          postSheetSourcesCrossTab("cloud-synced");
        }
      })
      .catch(() => {
        /* keep local cache */
      })
      .finally(() => {
        finishSyncCycle();
      });
  }, [finishSyncCycle]);

  useCrossTabVaultReload({
    channelName: SHEET_SOURCES_CHANNEL,
    matchesStorageKey: sheetSourcesStorageMatcher,
    getScopeKey: () => userIdRef.current,
    debounceMs: CROSS_TAB_RELOAD_DEBOUNCE_MS,
    onPeerReload: () => {
      applyCloudSources(onSourcesRef.current, loadSheetSources());
    },
  });

  useEffect(() => {
    if (!userId || !isSheetSourcesCloudAvailable()) {
      drainQueuedChangesRef.current = null;
      queuedChangesRef.current = [];
      return;
    }

    const runCloudChange = async (detail: SheetSourcesChangeDetail) => {
      if (detail.action === "delete" && detail.source) {
        await deleteSheetSourceFromCloud(detail.source, userId);
        return;
      }
      if (detail.source && !isSheetPendingDelete(detail.source)) {
        await pushSheetSourceToCloud(detail.source, userId);
        applyCloudSources(onSourcesRef.current, loadSheetSources());
        postSheetSourcesCrossTab("cloud-synced");
      }
    };

    const drainQueuedChanges = () => {
      if (syncingRef.current) return;
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
      if (!queuedChangesRef.current.length) return;

      pushTimerRef.current = window.setTimeout(() => {
        const detail = queuedChangesRef.current.shift();
        if (!detail) return;
        void (async () => {
          syncingRef.current = true;
          try {
            await runCloudChange(detail);
          } catch {
            /* offline / transient cloud error — keep local cache */
          } finally {
            finishSyncCycle();
          }
        })();
      }, CLOUD_PUSH_DEBOUNCE_MS);
    };

    drainQueuedChangesRef.current = drainQueuedChanges;
    return () => {
      drainQueuedChangesRef.current = null;
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [userId, finishSyncCycle]);

  useEffect(() => {
    if (!tabActive || !userId || !isSheetSourcesCloudAvailable()) return;
    let cancelled = false;
    const generation = syncGeneration.current;
    syncingRef.current = true;
    void syncSheetSourcesWithCloud(userId, {
      isStale: () => cancelled || generation !== syncGeneration.current,
    })
      .then((next) => {
        if (!cancelled && generation === syncGeneration.current) {
          applyCloudSources(onSourcesRef.current, next);
          postSheetSourcesCrossTab("cloud-synced");
        }
      })
      .catch(() => {
        /* keep local cache on sync failure */
      })
      .finally(() => {
        finishSyncCycle();
      });
    return () => {
      cancelled = true;
    };
  }, [tabActive, userId, finishSyncCycle]);

  useSheetRealtime(requestReconcile, userId, tabActive && isSheetSourcesCloudAvailable());

  useEffect(() => {
    if (!tabActive || !userId || !isSheetSourcesCloudAvailable()) return;

    const onFocus = () => {
      const now = Date.now();
      if (now - lastFocusReconcileRef.current < FOCUS_RECONCILE_MIN_MS) return;
      lastFocusReconcileRef.current = now;
      requestReconcile();
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [tabActive, userId, requestReconcile]);

  useEffect(() => {
    if (!tabActive || !userId) return;
    const onSession = () => {
      syncGeneration.current += 1;
      requestReconcile();
    };
    window.addEventListener("p0020:databox-session", onSession);
    return () => window.removeEventListener("p0020:databox-session", onSession);
  }, [tabActive, userId, requestReconcile]);

  useEffect(() => {
    if (!userId || !isSheetSourcesCloudAvailable()) return;

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<SheetSourcesChangeDetail>).detail;
      if (!detail) return;
      if (detail.action === "delete") syncGeneration.current += 1;
      queuedChangesRef.current = mergeQueuedSheetChanges(queuedChangesRef.current, detail);
      drainQueuedChangesRef.current?.();
    };

    window.addEventListener(SHEET_SOURCES_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener(SHEET_SOURCES_CHANGE_EVENT, onChange);
      if (pushTimerRef.current) window.clearTimeout(pushTimerRef.current);
    };
  }, [userId]);
}
