import { useCallback, useEffect, useMemo, useRef, useState, useDeferredValue } from "react";
import { Table2, Trash2, Upload, Pencil, Plus } from "lucide-react";
import {
  HubBulkActionButton,
  HubDirectoryBulkActionRail,
  HubSplitDirectoryFilterBar,
  HubSplitDirectoryPane,
  type FilterValues,
} from "@tool-workspace/hub-ui";
import { WorkspaceDirectorySearchToolbar } from "../workspace/WorkspaceDirectorySearchToolbar";
import { useAppToast } from "../../components/toast/ToastContext";
import {
  addSheetSource,
  loadSheetSources,
  removeSheetSource,
  updateSheetSourceHeaderRowIndex,
  updateSheetSourceLastSynced,
  updateSheetSourceTitle,
  type SheetSource,
} from "./sheet-sources";
import { SheetImportModal, type SheetImportModalResult } from "./SheetImportModal";
import { SheetPricingRowModal } from "./SheetPricingRowModal";
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
import { noopBridge, useSheetWorkspace } from "./sheet-workspace-context";
import { parseCsvToGrid, shouldLazyParseSheetCsv } from "./sheet-csv-grid";
import { buildHeaderRowCandidates, type SheetHeaderRowCandidate } from "./sheet-header-row-candidates";
import { runPhasedSheetCsvParse, type PhasedSheetParseHandle } from "./sheet-lazy-parse";
import { isSheetNetworkCacheFresh } from "./sheet-network-cache";
import { fetchSheetTabTitle, shouldSyncSheetTabTitle } from "./sheet-tab-title";
import { applySheetMainFilters, buildSheetMainFilterDefs } from "./sheet-main-filters";
import {
  deleteSheetGridCache,
  hydrateSheetGridCache,
  peekSheetGridFromCaches,
  writeSheetGridCache,
} from "./sheet-grid-cache";
import { deleteSheetGridCsvIdb, readSheetGridCsvIdb, writeSheetGridCsvIdb } from "./sheet-grid-idb-cache";
import { prefetchAdjacentSheetGrids, prefetchSheetGrid } from "./sheet-grid-preload";
import {
  fetchPricingCatalogGrid,
  isNonHttpSheetUrl,
  isPricingCatalogSource,
  pricingCatalogIdFromSource,
  shouldLoadPricingCatalogGrid,
  PRICING_CATALOG_PREFIX,
} from "./pricing-catalog-sheet";
import {
  appendGridRow,
  deletePricingCatalogRow,
  patchGridRow,
  pricingRowFromGridRow,
  upsertPricingCatalogRow,
} from "./pricing-catalog-edit";
import { setupSheetFilterIcons } from "./sheet-filter-icons";
import { countSheetSearchMatches } from "./sheet-search-highlight";
import { sheetTextIncludesQuery } from "./sheet-search-fold";
import { SheetSearchMatchChip } from "./SheetSearchMatchChip";

setupSheetFilterIcons();

function rowMatchesSheetQuery(row: string[], query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return row.some((cell) => sheetTextIncludesQuery(String(cell ?? ""), q));
}

export function SheetWorkspaceGridPane() {
  const {
    tabActive,
    sources,
    setSources,
    activeId,
    setActiveId,
    active,
    sortedRailSources,
    pageSize,
    setBridge,
  } = useSheetWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<SheetGridData | null>(null);
  const [gridSheetId, setGridSheetId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pricingEditOpen, setPricingEditOpen] = useState(false);
  const [pricingEditMode, setPricingEditMode] = useState<"add" | "edit">("edit");
  const [pricingEditRowIndex, setPricingEditRowIndex] = useState<number | null>(null);
  const { pushToast } = useAppToast();
  const [sheetQuery, setSheetQuery] = useState("");
  const deferredSheetQuery = useDeferredValue(sheetQuery);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [gridPrefs, setGridPrefs] = useState(() => readSheetGridPrefs(activeId ?? ""));
  const [headerRowCandidates, setHeaderRowCandidates] = useState<SheetHeaderRowCandidate[]>([]);
  const rawCsvRef = useRef<string | null>(null);
  const gridCacheRef = useRef<Map<string, SheetGridData>>(hydrateSheetGridCache());
  const activeIdRef = useRef(activeId);
  const activateLockRef = useRef(false);
  const phasedParseRef = useRef<PhasedSheetParseHandle | null>(null);
  activeIdRef.current = activeId;

  useEffect(() => {
    if (!activeId) return;
    setGridPrefs(readSheetGridPrefs(activeId));
    return subscribeSheetGridPrefs(() => setGridPrefs(readSheetGridPrefs(activeId)));
  }, [activeId]);

  const activeNativeCatalogId = useMemo(() => {
    if (!active || !shouldLoadPricingCatalogGrid(active)) return null;
    return pricingCatalogIdFromSource(active);
  }, [active]);
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
            lastSyncedAt: active.lastSyncedAt,
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
      active?.lastSyncedAt,
    ],
  );

  const resolvedGrid = useMemo(() => {
    if (!activeId) return null;
    if (grid && gridSheetId === activeId) return grid;
    return gridCacheRef.current.get(activeId) ?? null;
  }, [activeId, grid, gridSheetId]);

  // Keep the previous grid visible while the next sheet is loading to avoid a jarring blank flash.
  const visibleGrid = useMemo(() => resolvedGrid ?? (busy ? grid : null), [busy, grid, resolvedGrid]);

  const mainFilterDefs = useMemo(() => buildSheetMainFilterDefs(visibleGrid), [visibleGrid]);

  const displayGrid = useMemo(() => {
    if (!visibleGrid) return null;
    let rows = applySheetMainFilters(visibleGrid.rows, visibleGrid.header, filterValues);
    const q = deferredSheetQuery.trim().toLowerCase();
    if (q) rows = rows.filter((row) => rowMatchesSheetQuery(row, q));
    return { header: visibleGrid.header, rows };
  }, [filterValues, visibleGrid, deferredSheetQuery]);

  const searchMatchCount = useMemo(() => {
    if (!displayGrid || !deferredSheetQuery.trim()) return 0;
    return countSheetSearchMatches(displayGrid.rows, deferredSheetQuery);
  }, [displayGrid, deferredSheetQuery]);

  const hiddenCols = useMemo(() => new Set(gridPrefs.hidden), [gridPrefs.hidden]);

  const filteredRowCount = displayGrid?.rows.length ?? 0;

  const applySheetGridToUi = useCallback((sheetId: string, cached: SheetGridData) => {
    gridCacheRef.current.set(sheetId, cached);
    if (sheetId !== activeIdRef.current) return;
    setGrid(cached);
    setGridSheetId(sheetId);
    setBusy(false);
  }, []);

  const onGridCached = useCallback(
    (sheetId: string, cached: SheetGridData) => {
      applySheetGridToUi(sheetId, cached);
    },
    [applySheetGridToUi],
  );

  const activateSheet = useCallback(
    (id: string) => {
      if (id === activeIdRef.current) return;
      if (activateLockRef.current) return;
      activateLockRef.current = true;
      window.setTimeout(() => {
        activateLockRef.current = false;
      }, 160);
      activeIdRef.current = id;
      setError(null);
      const cached = peekSheetGridFromCaches(id, gridCacheRef.current);
      if (cached) applySheetGridToUi(id, cached);
      else setBusy(true);
      setActiveId(id);
    },
    [applySheetGridToUi],
  );

  const applyParsedGrid = useCallback(
    (sheetId: string, parsed: ReturnType<typeof parseCsvToGrid>) => {
      gridCacheRef.current.set(sheetId, parsed.grid);
      if (!parsed.grid.loadingMoreRows) writeSheetGridCache(sheetId, parsed.grid);
      setGrid(parsed.grid);
      setGridSheetId(sheetId);
      const nextPrefs = reconcileSheetGridPrefs(sheetId, parsed.grid.header, parsed.grid.rows);
      setGridPrefs(nextPrefs);
    },
    [],
  );

  const applyCsvToGrid = useCallback(
    async (
      loadId: string,
      csv: string,
      headerRowIndex: number | undefined,
      source: Pick<
        SheetSource,
        "id" | "title" | "rawUrl" | "gid" | "titleSource" | "headerRowIndex" | "lastSyncedAt"
      >,
    ) => {
      phasedParseRef.current?.cancel();
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        phasedParseRef.current = runPhasedSheetCsvParse(
          csv,
          {
            headerRowIndex,
            isActive: () => loadId === activeIdRef.current,
          },
          (partial) => {
            if (loadId !== activeIdRef.current) return;
            applyParsedGrid(loadId, partial);
            setBusy(false);
            if (!partial.loadingMoreRows) done();
          },
          (full) => {
            if (loadId !== activeIdRef.current) {
              done();
              return;
            }
            applyParsedGrid(loadId, full);
            void writeSheetGridCsvIdb(loadId, csv, full.headerRowIndex);
            updateSheetSourceLastSynced(source.id);
            setSources((prev) =>
              prev.map((s) => (s.id === source.id ? { ...s, lastSyncedAt: new Date().toISOString() } : s)),
            );
            if (full.headerRowIndex !== source.headerRowIndex) {
              updateSheetSourceHeaderRowIndex(source.id, full.headerRowIndex);
              setSources((prev) =>
                prev.map((s) => (s.id === source.id ? { ...s, headerRowIndex: full.headerRowIndex } : s)),
              );
            }
            if (shouldSyncSheetTabTitle(source)) {
              void fetchSheetTabTitle(source).then((title) => {
                if (!title || title === source.title || loadId !== activeIdRef.current) return;
                updateSheetSourceTitle(source.id, title);
                setSources((prev) => prev.map((s) => (s.id === source.id ? { ...s, title } : s)));
              });
            }
            done();
          },
        );
      });
    },
    [applyParsedGrid],
  );

  const applyNativeGrid = useCallback((sheetId: string, native: SheetGridData) => {
    gridCacheRef.current.set(sheetId, native);
    writeSheetGridCache(sheetId, native);
    setGrid(native);
    setGridSheetId(sheetId);
    const nextPrefs = reconcileSheetGridPrefs(sheetId, native.header, native.rows);
    setGridPrefs(nextPrefs);
  }, []);

  const loadActive = useCallback(async () => {
    if (!activeLoadSource) return;
    const source = activeLoadSource;
    const loadId = source.id;

    const sessionCached = peekSheetGridFromCaches(loadId, gridCacheRef.current);
    if (sessionCached && loadId === activeIdRef.current) {
      applySheetGridToUi(loadId, sessionCached);
    }

    const idbPromise = isPricingCatalogSource(source) ? Promise.resolve(null) : readSheetGridCsvIdb(loadId);
    const hasCachedGrid = Boolean(peekSheetGridFromCaches(loadId, gridCacheRef.current));
    if (!hasCachedGrid) {
      setBusy(true);
      const idbSnap = await idbPromise;
      if (!idbSnap) setError(null);
      if (idbSnap && loadId === activeIdRef.current) {
        rawCsvRef.current = idbSnap.csv;
        setHeaderRowCandidates(buildHeaderRowCandidates(idbSnap.csv));
        const stale = parseCsvToGrid(idbSnap.csv, {
          headerRowIndex: source.headerRowIndex ?? idbSnap.headerRowIndex,
          maxDataRows: shouldLazyParseSheetCsv(idbSnap.csv) ? 500 : undefined,
        });
        const preview = {
          ...stale,
          grid: {
            ...stale.grid,
            loadingMoreRows: shouldLazyParseSheetCsv(idbSnap.csv),
          },
        };
        gridCacheRef.current.set(loadId, preview.grid);
        applySheetGridToUi(loadId, preview.grid);
      }
    } else {
      void idbPromise.then((idbSnap) => {
        if (!idbSnap || loadId !== activeIdRef.current) return;
        rawCsvRef.current = idbSnap.csv;
        setHeaderRowCandidates(buildHeaderRowCandidates(idbSnap.csv));
      });
    }

    try {
      const hasWarmCache = Boolean(peekSheetGridFromCaches(loadId, gridCacheRef.current));
      if (!hasWarmCache) setBusy(true);

      if (shouldLoadPricingCatalogGrid(source)) {
        const catalogId = pricingCatalogIdFromSource(source);
        const native = await fetchPricingCatalogGrid(catalogId);
        if (loadId !== activeIdRef.current) return;
        setError(null);
        applyNativeGrid(loadId, native);
        updateSheetSourceLastSynced(source.id);
        setSources((prev) =>
          prev.map((s) => (s.id === source.id ? { ...s, lastSyncedAt: new Date().toISOString() } : s)),
        );
        return;
      }

      if (isNonHttpSheetUrl(source.csvUrl)) {
        throw new Error(
          "This sheet uses a native catalog URL — refresh the page (Ctrl+Shift+R) to load the latest Data Box build.",
        );
      }

      const warmGrid = peekSheetGridFromCaches(loadId, gridCacheRef.current);
      if (warmGrid && isSheetNetworkCacheFresh(source)) {
        applySheetGridToUi(loadId, warmGrid);
        setError(null);
        return;
      }

      const res = await fetch(source.csvUrl, { method: "GET" });
      if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);
      const csv = await res.text();
      const trimmed = csv.trimStart();
      if (trimmed.startsWith("<!") || /^<html[\s>]/i.test(trimmed)) {
        throw new Error("Sheet không truy cập được — bật quyền xem (Anyone with the link).");
      }
      rawCsvRef.current = csv;
      setHeaderRowCandidates(buildHeaderRowCandidates(csv));
      await applyCsvToGrid(loadId, csv, source.headerRowIndex, source);
      if (loadId !== activeIdRef.current) return;
    } catch (e) {
      if (loadId !== activeIdRef.current) return;
      if (peekSheetGridFromCaches(loadId, gridCacheRef.current)) {
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
  }, [activeLoadSource, applyCsvToGrid, applyNativeGrid, applySheetGridToUi]);

  useEffect(() => {
    return () => {
      phasedParseRef.current?.cancel();
    };
  }, []);

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
    setBridge({ activateSheet, prefetchSheet: onPrefetchSheet });
    return () => setBridge(noopBridge);
  }, [activateSheet, onPrefetchSheet, setBridge]);

  useEffect(() => {
    setFilterValues({});
  }, [activeId]);

  const onImport = useCallback(
    (res: SheetImportModalResult) => {
      setError(null);
      if (res.kind === "pricing-catalog") {
        const url = `${PRICING_CATALOG_PREFIX}${res.catalogId}`;
        const row = addSheetSource({
          title: res.title,
          rawUrl: url,
          csvUrl: url,
          gid: res.catalogId,
          titleSource: "manual",
        });
        const next = loadSheetSources();
        setSources(next);
        setActiveId(row.id);
        pushToast("Native sheet created — double-click a row to edit.", "success", 2400);
        return;
      }
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
        pushToast("Sheet already exists — switched to saved copy.", "info", 1800);
      }
    },
    [pushToast],
  );

  const openPricingRowEditor = useCallback((rowIndex: number) => {
    setPricingEditMode("edit");
    setPricingEditRowIndex(rowIndex);
    setPricingEditOpen(true);
  }, []);

  const openPricingRowAdd = useCallback(() => {
    setPricingEditMode("add");
    setPricingEditRowIndex(null);
    setPricingEditOpen(true);
  }, []);

  const onPricingRowSave = useCallback(
    async (row: ReturnType<typeof pricingRowFromGridRow>) => {
      if (!activeNativeCatalogId || !resolvedGrid) return;
      const sortOrder = pricingEditMode === "add" ? resolvedGrid.rows.length : (pricingEditRowIndex ?? 0);
      await upsertPricingCatalogRow(activeNativeCatalogId, row, sortOrder);
      const nextGrid =
        pricingEditMode === "add"
          ? appendGridRow(resolvedGrid, row)
          : patchGridRow(resolvedGrid, pricingEditRowIndex ?? 0, row);
      if (activeId) {
        gridCacheRef.current.set(activeId, nextGrid);
        writeSheetGridCache(activeId, nextGrid);
        setGrid(nextGrid);
        setGridSheetId(activeId);
      }
      pushToast("Pricing row saved to Supabase.", "success", 1800);
    },
    [activeId, activeNativeCatalogId, pricingEditMode, pricingEditRowIndex, pushToast, resolvedGrid],
  );

  const onPricingRowDelete = useCallback(async () => {
    if (!activeNativeCatalogId || pricingEditRowIndex == null || !resolvedGrid) return;
    const row = pricingRowFromGridRow(resolvedGrid.rows[pricingEditRowIndex] ?? []);
    await deletePricingCatalogRow(activeNativeCatalogId, row.platformKey);
    const nextRows = resolvedGrid.rows.filter((_, i) => i !== pricingEditRowIndex);
    const nextGrid = { header: [...resolvedGrid.header], rows: nextRows };
    if (activeId) {
      gridCacheRef.current.set(activeId, nextGrid);
      writeSheetGridCache(activeId, nextGrid);
      setGrid(nextGrid);
      setGridSheetId(activeId);
    }
    pushToast("Row deleted.", "info", 1600);
  }, [activeId, activeNativeCatalogId, pricingEditRowIndex, pushToast, resolvedGrid]);

  const resolveFullRowIndex = useCallback(
    (displayRowIndex: number) => {
      if (!displayGrid || !resolvedGrid) return displayRowIndex;
      const key = displayGrid.rows[displayRowIndex]?.[1];
      if (!key) return displayRowIndex;
      const fullIndex = resolvedGrid.rows.findIndex((r) => r[1] === key);
      return fullIndex >= 0 ? fullIndex : displayRowIndex;
    },
    [displayGrid, resolvedGrid],
  );

  const onGridRowDoubleClick = useCallback(
    (displayRowIndex: number) => {
      if (!activeNativeCatalogId) return;
      openPricingRowEditor(resolveFullRowIndex(displayRowIndex));
    },
    [activeNativeCatalogId, openPricingRowEditor, resolveFullRowIndex],
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
        countLabel={resolvedGrid?.loadingMoreRows ? "rows (loading more…)" : "rows"}
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

  const gridLoading = Boolean(activeId && busy && !resolvedGrid && !grid);
  const gridRefreshing = Boolean(activeId && busy && visibleGrid);
  const gridSwitching = Boolean(activeId && busy && !resolvedGrid && Boolean(grid));

  const sheetBulkActions = useMemo(
    () => (
      <HubDirectoryBulkActionRail>
        <HubBulkActionButton
          icon={<Upload size={14} aria-hidden />}
          label="Add sheet"
          title="Independent sheet or Google Sheet import"
          tone="sky"
          onClick={() => setImportOpen(true)}
        />
        {activeNativeCatalogId ? (
          <>
            <HubBulkActionButton
              icon={<Plus size={14} aria-hidden />}
              label="Add row"
              title="Add pricing row to native catalog"
              tone="emerald"
              onClick={openPricingRowAdd}
            />
            <HubBulkActionButton
              icon={<Pencil size={14} aria-hidden />}
              label="Edit"
              title="Double-click a row to edit — or select then Edit"
              tone="amber"
              disabled={pricingEditRowIndex == null && !resolvedGrid?.rows.length}
              onClick={() => {
                if (pricingEditRowIndex != null) openPricingRowEditor(pricingEditRowIndex);
                else if (resolvedGrid?.rows.length) openPricingRowEditor(0);
              }}
            />
          </>
        ) : null}
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
    [
      active,
      activeNativeCatalogId,
      onRemove,
      openPricingRowAdd,
      openPricingRowEditor,
      pricingEditRowIndex,
      resolvedGrid?.rows.length,
    ],
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
    <>
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
          refreshing={gridRefreshing}
          switching={gridSwitching}
          pageSize={pageSize}
          prefs={gridPrefs}
          searchQuery={sheetQuery}
          onWidthsChange={onWidthsChange}
          onRowDoubleClick={activeNativeCatalogId ? onGridRowDoubleClick : undefined}
          onRowClick={
            activeNativeCatalogId
              ? (idx) => setPricingEditRowIndex(resolveFullRowIndex(idx))
              : undefined
          }
          resetKey={`${activeId ?? ""}:${sheetQuery}:${JSON.stringify(filterValues)}:${gridPrefs.hidden.join(",")}:${gridPrefs.wrap ? "w" : "n"}:${gridPrefs.columnFit ?? "equal"}:${gridPrefs.textAlign ?? "left"}:${Object.keys(gridPrefs.widths).join(",")}`}
        />
      </HubSplitDirectoryPane>

      <SheetImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />
      <SheetPricingRowModal
        open={pricingEditOpen}
        mode={pricingEditMode}
        initial={
          pricingEditMode === "edit" && pricingEditRowIndex != null && resolvedGrid
            ? pricingRowFromGridRow(resolvedGrid.rows[pricingEditRowIndex] ?? [])
            : null
        }
        onClose={() => setPricingEditOpen(false)}
        onSave={onPricingRowSave}
        onDelete={pricingEditMode === "edit" ? onPricingRowDelete : undefined}
      />
    </>
  );
}
