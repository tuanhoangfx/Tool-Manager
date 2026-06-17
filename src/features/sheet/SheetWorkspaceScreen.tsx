import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table2, Trash2, Upload } from "lucide-react";
import {
  HubSplitDirectoryFilterBar,
  HubSplitDirectoryPane,
  HubFilterRowButton,
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
import type { SheetSourceSortKey } from "./SheetSourcesDirectoryTable";
import { parseCsvToGrid } from "./sheet-csv-grid";
import { fetchSheetTabTitle, shouldSyncSheetTabTitle } from "./sheet-tab-title";
import { applySheetMainFilters, buildSheetMainFilterDefs } from "./sheet-main-filters";

function rowMatchesSheetQuery(row: string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return row.some((cell) => String(cell ?? "").toLowerCase().includes(q));
}

async function refreshSheetTabTitles(sources: SheetSource[]): Promise<SheetSource[]> {
  let next = sources;
  for (const s of sources) {
    if (!shouldSyncSheetTabTitle(s)) continue;
    const title = await fetchSheetTabTitle(s);
    if (title && title !== s.title) {
      updateSheetSourceTitle(s.id, title);
      next = next.map((row) => (row.id === s.id ? { ...row, title } : row));
    }
  }
  return next;
}

export function SheetWorkspaceScreen({ tabActive = true }: { tabActive?: boolean }) {
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
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

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

  const filteredSources = useMemo(() => {
    let list = filterSheetSourcesByTimeRange(sources, railTimeRange);
    const q = railQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((s) => {
      const hay = `${s.title}\n${s.gid}\n${s.rawUrl}\n${s.csvUrl}`.toLowerCase();
      return hay.includes(q);
    });
  }, [railQuery, railTimeRange, sources]);

  const mainFilterDefs = useMemo(() => buildSheetMainFilterDefs(grid), [grid]);

  const displayGrid = useMemo(() => {
    if (!grid || gridSheetId !== activeId) return null;
    let rows = applySheetMainFilters(grid.rows, grid.header, filterValues);
    const q = sheetQuery.trim().toLowerCase();
    if (q) rows = rows.filter((row) => rowMatchesSheetQuery(row, q));
    return { header: grid.header, rows };
  }, [filterValues, grid, sheetQuery]);

  const hiddenCols = useMemo(() => new Set(gridPrefs.hidden), [gridPrefs.hidden]);

  const filteredRowCount = displayGrid?.rows.length ?? 0;

  const loadActive = useCallback(async () => {
    if (!active) return;
    const loadId = active.id;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(active.csvUrl, { method: "GET" });
      if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);
      const csv = await res.text();
      const trimmed = csv.trimStart();
      if (trimmed.startsWith("<!") || /^<html[\s>]/i.test(trimmed)) {
        throw new Error("Sheet không truy cập được — bật quyền xem (Anyone with the link).");
      }
      const parsed = parseCsvToGrid(csv, { headerRowIndex: active.headerRowIndex });
      if (loadId !== activeIdRef.current) return;
      setGrid(parsed.grid);
      setGridSheetId(loadId);
      const nextPrefs = reconcileSheetGridPrefs(active.id, parsed.grid.header, parsed.grid.rows);
      setGridPrefs(nextPrefs);
      updateSheetSourceLastSynced(active.id);
      setSources((prev) =>
        prev.map((s) => (s.id === active.id ? { ...s, lastSyncedAt: new Date().toISOString() } : s)),
      );
      if (parsed.headerRowIndex !== active.headerRowIndex) {
        updateSheetSourceHeaderRowIndex(active.id, parsed.headerRowIndex);
        setSources((prev) =>
          prev.map((s) => (s.id === active.id ? { ...s, headerRowIndex: parsed.headerRowIndex } : s)),
        );
      }
      if (shouldSyncSheetTabTitle(active)) {
        const title = await fetchSheetTabTitle(active);
        if (title && title !== active.title) {
          updateSheetSourceTitle(active.id, title);
          setSources((prev) => prev.map((s) => (s.id === active.id ? { ...s, title } : s)));
        }
      }
    } catch (e) {
      if (loadId !== activeIdRef.current) return;
      const msg = e instanceof Error ? e.message : String(e ?? "Load failed.");
      setError(msg);
      setGrid(null);
      setGridSheetId(null);
    } finally {
      if (loadId === activeIdRef.current) setBusy(false);
    }
  }, [active]);

  useEffect(() => {
    if (!tabActive) return;
    void loadActive();
  }, [loadActive, tabActive, activeId]);

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
    const next = loadSheetSources();
    setSources(next);
    setActiveId(next[0]?.id ?? null);
    setGrid(null);
    setGridSheetId(null);
  }, [active]);

  const onCopyCell = useCallback(
    (value: string) => {
      const text = String(value ?? "").trim();
      if (!text) return;
      void navigator.clipboard
        .writeText(text)
        .then(() => pushToast("Đã copy vào clipboard.", "success", 1400))
        .catch(() => pushToast("Copy thất bại (clipboard permission).", "warn", 2200));
    },
    [pushToast],
  );

  const onToggleColumn = useCallback(
    (index: number) => {
      if (!activeId || !grid) return;
      const nextHidden = new Set(hiddenCols);
      if (nextHidden.has(index)) nextHidden.delete(index);
      else {
        const visible = grid.header.length - nextHidden.size;
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
    [activeId, grid, gridPrefs.columnFit, gridPrefs.widths, gridPrefs.wrap, hiddenCols],
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
        total={grid?.rows.length ?? 0}
        countLabel="rows"
        displayBand={
          <SheetDisplayBandToolbar
            sheetId={activeId}
            headers={grid?.header ?? []}
            hidden={hiddenCols}
            onToggleColumn={onToggleColumn}
            wrap={Boolean(gridPrefs.wrap)}
            onWrapChange={onWrapChange}
            columnFit={gridPrefs.columnFit ?? "equal"}
            onColumnFitChange={onColumnFitChange}
            textAlign={gridPrefs.textAlign ?? "center"}
            onTextAlignChange={onTextAlignChange}
            onResetColumnWidths={onResetColumnWidths}
          />
        }
      />
    ),
    [
      activeId,
      filteredRowCount,
      grid?.header,
      grid?.rows.length,
      gridPrefs.columnFit,
      gridPrefs.textAlign,
      gridPrefs.wrap,
      hiddenCols,
      onColumnFitChange,
      onResetColumnWidths,
      onTextAlignChange,
      onToggleColumn,
      onWrapChange,
    ],
  );

  const sheetBulkActions = useMemo(
    () => (
      <>
        <HubFilterRowButton
          icon={<Upload size={12} />}
          label="Import"
          tone="cyan"
          onClick={() => setImportOpen(true)}
        />
        <HubFilterRowButton
          icon={<Trash2 size={12} />}
          label="Remove"
          tone="rose"
          disabled={!active}
          onClick={onRemove}
        />
      </>
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
              toolbar={sheetToolbar}
              row2Leading={sheetFilterRowLeading}
              row2Actions={sheetBulkActions}
            />
          }
        >
          <SheetGridTable
            data={displayGrid}
            pageSize={pageSize}
            prefs={gridPrefs}
            onWidthsChange={onWidthsChange}
            onCopyCell={onCopyCell}
            resetKey={`${activeId ?? ""}:${sheetQuery}:${JSON.stringify(filterValues)}:${gridPrefs.hidden.join(",")}:${gridPrefs.wrap ? "w" : "n"}:${gridPrefs.columnFit ?? "equal"}:${gridPrefs.textAlign ?? "center"}:${Object.keys(gridPrefs.widths).join(",")}`}
          />
        </HubSplitDirectoryPane>
      </SheetHubChrome>

      <SheetImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={onImport} />
    </div>
  );
}
