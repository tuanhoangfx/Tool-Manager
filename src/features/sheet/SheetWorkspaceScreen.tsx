import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table2, Trash2, Upload } from "lucide-react";
import {
  HubBulkActionButton,
  HubDirectoryBulkActionRail,
  HubSplitDirectoryFilterBar,
  HubSplitDirectoryPane,
  useDirectoryTimeRange,
  useHubTablePageSize,
  type FilterValues,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import { WorkspaceDirectorySearchToolbar } from "../workspace/WorkspaceDirectorySearchToolbar";
import { useAppToast } from "../../components/toast/ToastContext";
import {
  addSheetSource,
  loadSheetSources,
  removeSheetSource,
  sheetSourceDedupeKey,
  updateSheetSourceHeaderRowIndex,
  updateSheetSourceLastSynced,
  updateSheetSourceTitle,
  type SheetSource,
} from "./sheet-sources";
import { SheetImportModal } from "./SheetImportModal";
import {
  readSheetGridPrefs,
  reconcileSheetGridPrefs,
  subscribeSheetGridPrefs,
  writeSheetGridPrefs,
  type SheetColumnFit,
  type SheetTextAlign,
} from "./sheet-grid-prefs";
import { SheetDisplayBandToolbar } from "./SheetDisplayBandToolbar";
import { SheetGridTable } from "./SheetGridTable";
import type { SheetGridData } from "./sheet-grid-types";
import { SheetHubChrome } from "./SheetHubChrome";
import { filterSheetSourcesByTimeRange, SheetSourcesRail } from "./SheetSourcesRail";
import { sortSheetSources, type SheetSourceSortKey } from "./SheetSourcesDirectoryTable";
import { parseCsvToGrid } from "./sheet-csv-grid";
import { buildHeaderRowCandidates, type SheetHeaderRowCandidate } from "./sheet-header-row-candidates";
import { fetchSheetTabTitle, shouldSyncSheetTabTitle } from "./sheet-tab-title";
import { applySheetMainFilters, buildSheetMainFilterDefs } from "./sheet-main-filters";
import { deleteSheetGridCache, hydrateSheetGridCache, writeSheetGridCache } from "./sheet-grid-cache";
import { deleteSheetGridCsvIdb, readSheetGridCsvIdb, writeSheetGridCsvIdb } from "./sheet-grid-idb-cache";
import { prefetchAdjacentSheetGrids, prefetchSheetGrid } from "./sheet-grid-preload";
import { setupSheetFilterIcons } from "./sheet-filter-icons";
import { countSheetSearchMatches } from "./sheet-search-highlight";
import { sheetTextIncludesQuery } from "./sheet-search-fold";
import { SheetSearchMatchChip } from "./SheetSearchMatchChip";
import { useNotesAuth } from "../notes/AuthSessionProvider";
import { useSheetSourcesCloud } from "./useSheetSourcesCloud";
import { filterSheetPendingDeletes, isSheetPendingDelete } from "./sheet-sync-pending";

setupSheetFilterIcons();

function rowMatchesSheetQuery(row: string[], query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return row.some((cell) => sheetTextIncludesQuery(String(cell ?? ""), q));
}

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

export function SheetWorkspaceScreen({ tabActive = true }: { tabActive?: boolean }) {
  const { session } = useNotesAuth();
  const [sources, setSources] = useState<SheetSource[]>(() => loadSheetSources());
  const [activeId, setActiveId] = useState<string | null>(() => sources[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<SheetGridData | null>(null);
  const [gridSheetId, setGridSheetId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const pageSize = useHubTablePageSize();
  const railTimeRange = useDirectoryTimeRange();
  const { pushToast } = useAppToast();
  const [railQuery, setRailQuery] = useState("");
  const [sheetQuery, setSheetQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [railSortKey, setRailSortKey] = useState<SheetSourceSortKey>("title");
  const [railSortDir, setRailSortDir] = useState<HubSortDir>("asc");
  const [gridPrefs, setGridPrefs] = useState(() => readSheetGridPrefs(activeId ?? ""));
  const [headerRowCandidates, setHeaderRowCandidates] = useState<SheetHeaderRowCandidate[]>([]);
  const rawCsvRef = useRef<string | null>(null);
  const gridCacheRef = useRef<Map<string, SheetGridData>>(hydrateSheetGridCache());
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

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
    void refreshSheetTabTitles(loadSheetSources()).then((next) => {
      if (!cancelled) setSources(next);
    });
    return () => {
      cancelled = true;
    };
  }, [tabActive]);

  useEffect(() => {
    if (!activeId) return;
    setGridPrefs(readSheetGridPrefs(activeId));
    return subscribeSheetGridPrefs(() => setGridPrefs(readSheetGridPrefs(activeId)));
  }, [activeId]);

  const active = useMemo(() => sources.find((s) => s.id === activeId) ?? null, [activeId, sources]);
  const activeLoadSource = useMemo(
    () =>
      active
        ? {
            id: active.id,
            title: active.title,
            rawUrl: active.rawUrl,
            csvUrl: active.csvUrl,
            gid: active.gid,
            headerRowIndex: active.headerRowIndex,
            titleSource: active.titleSource,
          }
        : null,
    [
      active?.id,
      active?.title,
      active?.rawUrl,
      active?.csvUrl,
      active?.gid,
      active?.headerRowIndex,
      active?.titleSource,
    ],
  );

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

  const resolvedGrid = useMemo(() => {
    if (!activeId) return null;
    if (grid && gridSheetId === activeId) return grid;
    return gridCacheRef.current.get(activeId) ?? null;
  }, [activeId, grid, gridSheetId]);

  const mainFilterDefs = useMemo(() => buildSheetMainFilterDefs(resolvedGrid), [resolvedGrid]);

  const displayGrid = useMemo(() => {
    if (!resolvedGrid) return null;
    let rows = applySheetMainFilters(resolvedGrid.rows, resolvedGrid.header, filterValues);
    const q = sheetQuery.trim().toLowerCase();
    if (q) rows = rows.filter((row) => rowMatchesSheetQuery(row, q));
    return { header: resolvedGrid.header, rows };
  }, [filterValues, resolvedGrid, sheetQuery]);

  const hiddenCols = useMemo(() => new Set(gridPrefs.hidden), [gridPrefs.hidden]);

  const filteredRowCount = displayGrid?.rows.length ?? 0;

  const searchMatchCount = useMemo(() => {
    if (!displayGrid || !sheetQuery.trim()) return 0;
    return countSheetSearchMatches(displayGrid.rows, sheetQuery);
  }, [displayGrid, sheetQuery]);

  const onGridCached = useCallback((sheetId: string, cached: SheetGridData) => {
    gridCacheRef.current.set(sheetId, cached);
    if (sheetId !== activeIdRef.current) return;
    setGrid(cached);
    setGridSheetId(sheetId);
  }, []);

  const applyParsedGrid = useCallback(
    (sheetId: string, parsed: ReturnType<typeof parseCsvToGrid>) => {
      gridCacheRef.current.set(sheetId, parsed.grid);
      writeSheetGridCache(sheetId, parsed.grid);
      setGrid(parsed.grid);
      setGridSheetId(sheetId);
      const nextPrefs = reconcileSheetGridPrefs(sheetId, parsed.grid.header, parsed.grid.rows);
      setGridPrefs(nextPrefs);
    },
    [],
  );

  const loadActive = useCallback(async () => {
    if (!activeLoadSource) return;
    const source = activeLoadSource;
    const loadId = source.id;

    const idbSnap = await readSheetGridCsvIdb(loadId);
    if (!idbSnap) setError(null);
    if (idbSnap && loadId === activeIdRef.current) {
      rawCsvRef.current = idbSnap.csv;
      setHeaderRowCandidates(buildHeaderRowCandidates(idbSnap.csv));
      const stale = parseCsvToGrid(idbSnap.csv, {
        headerRowIndex: source.headerRowIndex ?? idbSnap.headerRowIndex,
      });
      gridCacheRef.current.set(loadId, stale.grid);
      writeSheetGridCache(loadId, stale.grid);
      setGrid(stale.grid);
      setGridSheetId(loadId);
    }

    setBusy(true);
    try {
      const res = await fetch(source.csvUrl, { method: "GET" });
      if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);
      const csv = await res.text();
      const trimmed = csv.trimStart();
      if (trimmed.startsWith("<!") || /^<html[\s>]/i.test(trimmed)) {
        throw new Error("Sheet không truy cập được — bật quyền xem (Anyone with the link).");
      }
      rawCsvRef.current = csv;
      setHeaderRowCandidates(buildHeaderRowCandidates(csv));
      const parsed = parseCsvToGrid(csv, { headerRowIndex: source.headerRowIndex });
      if (loadId !== activeIdRef.current) return;
      applyParsedGrid(loadId, parsed);
      void writeSheetGridCsvIdb(loadId, csv, parsed.headerRowIndex);
      updateSheetSourceLastSynced(source.id);
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, lastSyncedAt: new Date().toISOString() } : s)),
      );
      if (parsed.headerRowIndex !== source.headerRowIndex) {
        updateSheetSourceHeaderRowIndex(source.id, parsed.headerRowIndex);
        setSources((prev) =>
          prev.map((s) => (s.id === source.id ? { ...s, headerRowIndex: parsed.headerRowIndex } : s)),
        );
      }
      if (shouldSyncSheetTabTitle(source)) {
        const title = await fetchSheetTabTitle(source);
        if (title && title !== source.title) {
          updateSheetSourceTitle(source.id, title);
          setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, title } : s)));
        }
      }
    } catch (e) {
      if (loadId !== activeIdRef.current) return;
      if (idbSnap) {
        setError((prev) => prev ?? "Không tải được Google Sheet — đang hiển thị bản lưu offline.");
        return;
      }
      const msg = e instanceof Error ? e.message : String(e ?? "Load failed.");
      setError(msg);
      setGrid(null);
      setGridSheetId(null);
    } finally {
      if (loadId === activeIdRef.current) setBusy(false);
    }
  }, [activeLoadSource, applyParsedGrid]);

  useEffect(() => {
    if (!tabActive) return;
    void loadActive();
  }, [loadActive, tabActive, activeId]);

  useEffect(() => {
    if (!tabActive) return;
    prefetchAdjacentSheetGrids(sortedRailSources, activeId, onGridCached);
  }, [activeId, onGridCached, sortedRailSources, tabActive]);

  const onPrefetchSheet = useCallback(
    (source: SheetSource) => prefetchSheetGrid(source, onGridCached),
    [onGridCached],
  );

  useEffect(() => {
    setFilterValues({});
  }, [activeId]);

  const onRailSort = useCallback((key: SheetSourceSortKey) => {
    if (railSortKey === key) setRailSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setRailSortKey(key);
      setRailSortDir("asc");
    }
  }, [railSortKey]);

  const onImport = useCallback(
    (res: {
      title: string;
      rawUrl: string;
      csvUrl: string;
      gid: string;
      titleSource: "auto" | "manual";
    }) => {
      setError(null);
      const row = addSheetSource({
        title: res.title,
        rawUrl: res.rawUrl,
        csvUrl: res.csvUrl,
        gid: res.gid,
        titleSource: res.titleSource,
      });
      const next = loadSheetSources();
      setSources(next);
      setActiveId(row.id);
      if (next.find((s) => s.id === row.id) !== row) {
        pushToast("Sheet đã tồn tại — chuyển sang bản đã lưu.", "info", 1800);
      }
    },
    [pushToast],
  );

  const onRemove = useCallback(() => {
    if (!active) return;
    removeSheetSource(active.id);
    gridCacheRef.current.delete(active.id);
    deleteSheetGridCache(active.id);
    void deleteSheetGridCsvIdb(active.id);
    const next = loadSheetSources();
    setSources(next);
    setActiveId(next[0]?.id ?? null);
    setGrid(null);
    setGridSheetId(null);
  }, [active]);

  const onHeaderRowChange = useCallback(
    (headerRowIndex: number) => {
      if (!active || !rawCsvRef.current) return;
      updateSheetSourceHeaderRowIndex(active.id, headerRowIndex);
      setSources((prev) =>
        prev.map((s) => (s.id === active.id ? { ...s, headerRowIndex } : s)),
      );
      const parsed = parseCsvToGrid(rawCsvRef.current, { headerRowIndex });
      applyParsedGrid(active.id, parsed);
    },
    [active, applyParsedGrid],
  );

  const onToggleColumn = useCallback(
    (index: number) => {
      if (!activeId || !resolvedGrid) return;
      const nextHidden = new Set(hiddenCols);
      if (nextHidden.has(index)) nextHidden.delete(index);
      else {
        const visible = resolvedGrid.header.length - nextHidden.size;
        if (visible <= 1) return;
        nextHidden.add(index);
      }
      const patch = {
        hidden: [...nextHidden],
        widths: gridPrefs.widths,
        wrap: gridPrefs.wrap,
        columnFit: gridPrefs.columnFit,
      };
      writeSheetGridPrefs(activeId, patch);
      setGridPrefs((prev) => ({ ...prev, ...patch }));
    },
    [activeId, resolvedGrid, gridPrefs.columnFit, gridPrefs.widths, gridPrefs.wrap, hiddenCols],
  );

  const onWrapChange = useCallback(
    (wrap: boolean) => {
      if (!activeId) return;
      const patch = {
        hidden: gridPrefs.hidden,
        widths: gridPrefs.widths,
        wrap,
        columnFit: gridPrefs.columnFit,
      };
      writeSheetGridPrefs(activeId, patch);
      setGridPrefs((prev) => ({ ...prev, ...patch }));
    },
    [activeId, gridPrefs.columnFit, gridPrefs.hidden, gridPrefs.widths],
  );

  const onWidthsChange = useCallback(
    (widths: Record<string, number>) => {
      if (!activeId) return;
      const patch = {
        hidden: gridPrefs.hidden,
        widths,
        wrap: gridPrefs.wrap,
        columnFit: "weighted" as SheetColumnFit,
      };
      writeSheetGridPrefs(activeId, patch);
      setGridPrefs((prev) => ({ ...prev, ...patch }));
    },
    [activeId, gridPrefs.hidden, gridPrefs.wrap],
  );

  const onColumnFitChange = useCallback(
    (columnFit: SheetColumnFit) => {
      if (!activeId) return;
      const patch = {
        hidden: gridPrefs.hidden,
        widths: gridPrefs.widths,
        wrap: gridPrefs.wrap,
        columnFit,
        textAlign: gridPrefs.textAlign,
      };
      writeSheetGridPrefs(activeId, patch);
      setGridPrefs((prev) => ({ ...prev, ...patch }));
    },
    [activeId, gridPrefs.hidden, gridPrefs.textAlign, gridPrefs.widths, gridPrefs.wrap],
  );

  const onTextAlignChange = useCallback(
    (textAlign: SheetTextAlign) => {
      if (!activeId) return;
      const patch = {
        hidden: gridPrefs.hidden,
        widths: gridPrefs.widths,
        wrap: gridPrefs.wrap,
        columnFit: gridPrefs.columnFit,
        textAlign,
      };
      writeSheetGridPrefs(activeId, patch);
      setGridPrefs((prev) => ({ ...prev, ...patch }));
    },
    [activeId, gridPrefs.columnFit, gridPrefs.hidden, gridPrefs.widths, gridPrefs.wrap],
  );

  const onResetColumnWidths = useCallback(
    (next: ReturnType<typeof readSheetGridPrefs>) => {
      setGridPrefs(next);
      pushToast("Column widths reset.", "info", 1600);
    },
    [pushToast],
  );

  const sheetToolbar = useMemo(
    () => (
      <WorkspaceDirectorySearchToolbar
        screen="sheet"
        showTimeRange={false}
        showRefresh={false}
        showViewToggle={false}
        countIcon={Table2}
        shown={filteredRowCount}
        total={resolvedGrid?.rows.length ?? 0}
        countLabel="rows"
        displayBand={
          <SheetDisplayBandToolbar
            sheetId={activeId}
            headers={resolvedGrid?.header ?? []}
            hidden={hiddenCols}
            onToggleColumn={onToggleColumn}
            wrap={Boolean(gridPrefs.wrap)}
            onWrapChange={onWrapChange}
            columnFit={gridPrefs.columnFit ?? "equal"}
            onColumnFitChange={onColumnFitChange}
            textAlign={gridPrefs.textAlign ?? "left"}
            onTextAlignChange={onTextAlignChange}
            onResetColumnWidths={onResetColumnWidths}
            headerRowIndex={active?.headerRowIndex}
            headerRowCandidates={headerRowCandidates}
            onHeaderRowChange={onHeaderRowChange}
          />
        }
      />
    ),
    [
      activeId,
      filteredRowCount,
      resolvedGrid?.header,
      resolvedGrid?.rows.length,
      gridPrefs.columnFit,
      gridPrefs.textAlign,
      gridPrefs.wrap,
      hiddenCols,
      onColumnFitChange,
      onResetColumnWidths,
      onTextAlignChange,
      onToggleColumn,
      onWrapChange,
      onHeaderRowChange,
      headerRowCandidates,
      active?.headerRowIndex,
    ],
  );

  const gridLoading = Boolean(activeId && busy && !resolvedGrid);

  const sheetBulkActions = useMemo(
    () => (
      <HubDirectoryBulkActionRail>
        <HubBulkActionButton
          icon={<Upload size={14} aria-hidden />}
          label="Import"
          title="Import spreadsheet source"
          tone="sky"
          onClick={() => setImportOpen(true)}
        />
        <HubBulkActionButton
          icon={<Trash2 size={14} aria-hidden />}
          label="Remove"
          title="Remove selected source"
          tone="rose"
          disabled={!active}
          onClick={onRemove}
        />
      </HubDirectoryBulkActionRail>
    ),
    [active, onRemove],
  );

  const sheetFilterRowLeading = useMemo(
    () =>
      error ? (
        <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-[11px] text-rose-100">
          {error}
        </p>
      ) : null,
    [error],
  );

  if (!tabActive) return null;

  return (
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
          onSelect={setActiveId}
          onPrefetch={onPrefetchSheet}
          resetKey={`${railQuery}:${railTimeRange}:${railSortKey}:${railSortDir}:${filteredSources.length}`}
        />

        <HubSplitDirectoryPane
          className="sheet-panel min-h-0 min-w-0 flex-1"
          variant="panel"
          filterBar={
            <HubSplitDirectoryFilterBar
              shortcutScope="sheet"
              query={sheetQuery}
              onQueryChange={setSheetQuery}
              placeholder="Search rows…"
              filters={mainFilterDefs}
              values={filterValues}
              onValuesChange={setFilterValues}
              searchTrailing={sheetQuery.trim() ? <SheetSearchMatchChip count={searchMatchCount} /> : null}
              toolbar={sheetToolbar}
              row2Leading={sheetFilterRowLeading}
              row2Actions={sheetBulkActions}
            />
          }
        >
          <SheetGridTable
            data={displayGrid}
            loading={gridLoading}
            pageSize={pageSize}
            prefs={gridPrefs}
            searchQuery={sheetQuery}
            onWidthsChange={onWidthsChange}
            resetKey={`${activeId ?? ""}:${sheetQuery}:${JSON.stringify(filterValues)}:${gridPrefs.hidden.join(",")}:${gridPrefs.wrap ? "w" : "n"}:${gridPrefs.columnFit ?? "equal"}:${gridPrefs.textAlign ?? "left"}:${Object.keys(gridPrefs.widths).join(",")}`}
          />
        </HubSplitDirectoryPane>
      </SheetHubChrome>

      <SheetImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />
    </div>
  );
}
