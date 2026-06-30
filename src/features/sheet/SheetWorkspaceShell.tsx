import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useDirectoryTimeRange, useHubTablePageSize, type HubSortDir } from "@tool-workspace/hub-ui";
import {
  loadSheetSources,
  sheetSourceDedupeKey,
  updateSheetSourceTitle,
  type SheetSource,
} from "./sheet-sources";
import { SheetHubChrome } from "./SheetHubChrome";
import { filterSheetSourcesByTimeRange, SheetSourcesRail } from "./SheetSourcesRail";
import { sortSheetSources, type SheetSourceSortKey } from "./SheetSourcesDirectoryTable";
import { fetchSheetTabTitle, shouldSyncSheetTabTitle } from "./sheet-tab-title";
import { sheetTextIncludesQuery } from "./sheet-search-fold";
import { useNotesAuth } from "../notes/AuthSessionProvider";
import { useSheetSourcesCloud } from "./useSheetSourcesCloud";
import { filterSheetPendingDeletes, isSheetPendingDelete } from "./sheet-sync-pending";
import { noopBridge, SheetWorkspaceProvider } from "./sheet-workspace-context";

const SheetWorkspaceGridPane = lazy(() =>
  import("./SheetWorkspaceGridPane").then((m) => ({ default: m.SheetWorkspaceGridPane })),
);

async function refreshSheetTabTitles(sources: SheetSource[]): Promise<SheetSource[]> {
  for (const s of filterSheetPendingDeletes(sources)) {
    if (isSheetPendingDelete(s)) continue;
    if (!shouldSyncSheetTabTitle(s)) continue;
    const title = await fetchSheetTabTitle(s);
    if (!title || title === s.title) continue;
    if (!loadSheetSources().some((row) => row.id === s.id)) continue;
    if (isSheetPendingDelete(s)) continue;
    updateSheetSourceTitle(s.id, title);
  }
  return loadSheetSources();
}

function SheetGridPaneFallback() {
  return (
    <div className="sheet-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-[240px] flex-1 items-center justify-center p-6 text-center text-[12px] text-[var(--muted)]">
        Loading grid…
      </div>
    </div>
  );
}

export function SheetWorkspaceScreen({ tabActive = true }: { tabActive?: boolean }) {
  const { session } = useNotesAuth();
  const [sources, setSources] = useState<SheetSource[]>(() => loadSheetSources());
  const [activeId, setActiveId] = useState<string | null>(() => sources[0]?.id ?? null);
  const [bridge, setBridge] = useState(noopBridge);
  const pageSize = useHubTablePageSize();
  const railTimeRange = useDirectoryTimeRange();
  const [railQuery, setRailQuery] = useState("");
  const [railSortKey, setRailSortKey] = useState<SheetSourceSortKey>("title");
  const [railSortDir, setRailSortDir] = useState<HubSortDir>("asc");

  const onCloudSources = useCallback((next: SheetSource[]) => {
    setSources((prevSources) => {
      setActiveId((cur) => {
        if (!cur) return next[0]?.id ?? null;
        if (next.some((s) => s.id === cur)) return cur;
        const old = prevSources.find((s) => s.id === cur);
        if (old) {
          const key = sheetSourceDedupeKey(old);
          const match = next.find((s) => sheetSourceDedupeKey(s) === key);
          if (match) return match.id;
        }
        return next[0]?.id ?? null;
      });
      return next;
    });
  }, []);

  useSheetSourcesCloud(session, tabActive, onCloudSources);

  useEffect(() => {
    if (!tabActive) return;
    const next = loadSheetSources();
    setSources(next);
    setActiveId((cur) => cur ?? next[0]?.id ?? null);
  }, [tabActive]);

  useEffect(() => {
    if (!tabActive) return;
    let cancelled = false;
    const list = loadSheetSources();
    void refreshSheetTabTitles(list).then((next) => {
      if (!cancelled) setSources(next);
    });
    return () => {
      cancelled = true;
    };
  }, [tabActive, sources.length]);

  const active = useMemo(() => sources.find((s) => s.id === activeId) ?? null, [activeId, sources]);

  const filteredSources = useMemo(() => {
    let list = filterSheetSourcesByTimeRange(sources, railTimeRange);
    const q = railQuery.trim();
    if (!q) return list;
    return list.filter((s) => {
      const hay = `${s.title}\n${s.gid}\n${s.rawUrl}\n${s.csvUrl}`;
      return sheetTextIncludesQuery(hay, q);
    });
  }, [railQuery, railTimeRange, sources]);

  const sortedRailSources = useMemo(
    () => sortSheetSources(filteredSources, railSortKey, railSortDir),
    [filteredSources, railSortKey, railSortDir],
  );

  const onRailSort = useCallback(
    (key: SheetSourceSortKey) => {
      if (railSortKey === key) setRailSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setRailSortKey(key);
        setRailSortDir("asc");
      }
    },
    [railSortKey],
  );

  const contextValue = useMemo(
    () => ({
      tabActive,
      session,
      sources,
      setSources,
      activeId,
      setActiveId,
      active,
      filteredSources,
      sortedRailSources,
      pageSize,
      railQuery,
      setRailQuery,
      railSortKey,
      railSortDir,
      onRailSort,
      bridge,
      setBridge,
    }),
    [
      tabActive,
      session,
      sources,
      activeId,
      active,
      filteredSources,
      sortedRailSources,
      pageSize,
      railQuery,
      railSortKey,
      railSortDir,
      onRailSort,
      bridge,
    ],
  );

  if (!tabActive) return null;

  return (
    <SheetWorkspaceProvider value={contextValue}>
      <div className="sheet-workspace flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SheetHubChrome sources={sources} active={active}>
          <SheetSourcesRail
            sources={filteredSources}
            totalCount={sources.length}
            activeId={activeId}
            pageSize={pageSize}
            query={railQuery}
            onQueryChange={setRailQuery}
            sortKey={railSortKey}
            sortDir={railSortDir}
            onSort={onRailSort}
            onSelect={bridge.activateSheet}
            onPrefetch={bridge.prefetchSheet}
            resetKey={`${railQuery}:${railTimeRange}:${railSortKey}:${railSortDir}:${filteredSources.length}`}
          />

          <Suspense fallback={<SheetGridPaneFallback />}>
            <SheetWorkspaceGridPane />
          </Suspense>
        </SheetHubChrome>
      </div>
    </SheetWorkspaceProvider>
  );
}
