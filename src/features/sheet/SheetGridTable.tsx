/** read-only-directory — dynamic CSV columns; copy icon per cell (2FA golden). */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  DirectoryInlineTable,
  DirectoryTableBodyCell,
  HubPaginatedTableShell,
  HubTableColumnHeader,
} from "@tool-workspace/hub-ui";
import { SHEET_DIRECTORY_TABLE_BASE_CLASS, SHEET_DIRECTORY_TABLE_WRAP_PANEL_CLASS } from "./sheet-directory-table";
import {
  SHEET_GRID_DEFAULT_COL_WIDTH,
  SHEET_GRID_MIN_COL_WIDTH,
  type SheetGridColumnPrefs,
} from "./sheet-grid-prefs";
import type { SheetGridData } from "./sheet-grid-types";
import { resolveSheetGridHeaderRole } from "./sheet-grid-header-role";
import { SheetGridCopyCell } from "./sheet-grid-copy-cell";
import { SheetHighlightedText } from "./sheet-search-highlight";
import { SHEET_GRID_ROW_HEIGHT, useSheetGridVirtualWindow } from "./useSheetGridVirtualWindow";

export type { SheetGridData } from "./sheet-grid-types";

type IndexedRow = { row: string[]; index: number };

function renderSheetGridBodyRow({
  row,
  globalIndex,
  visibleIndices,
  wrap,
  searchQuery,
  onRowClick,
  onRowDoubleClick,
}: {
  row: string[];
  globalIndex: number;
  visibleIndices: number[];
  wrap: boolean;
  searchQuery: string;
  onRowClick?: (rowIndex: number) => void;
  onRowDoubleClick?: (rowIndex: number) => void;
}) {
  const editable = Boolean(onRowDoubleClick || onRowClick);
  return (
    <tr
      key={String(globalIndex)}
      className={`hub-users-row hub-users-row--static sheet-grid-row${editable ? " sheet-grid-row--editable cursor-pointer" : ""}`}
      onClick={onRowClick && globalIndex >= 0 ? () => onRowClick(globalIndex) : undefined}
      onDoubleClick={onRowDoubleClick && globalIndex >= 0 ? () => onRowDoubleClick(globalIndex) : undefined}
    >
      {visibleIndices.map((c) => (
        <DirectoryTableBodyCell key={String(c)} colClass="sheet-grid-td align-top">
          <span className={wrap ? "sheet-grid-cell sheet-grid-cell--wrap" : "sheet-grid-cell truncate"}>
            <SheetGridCopyCell value={row[c] ?? ""}>
              <SheetHighlightedText text={row[c] ?? ""} query={searchQuery} />
            </SheetGridCopyCell>
          </span>
        </DirectoryTableBodyCell>
      ))}
    </tr>
  );
}

export function SheetGridTable({
  data,
  loading = false,
  refreshing = false,
  switching = false,
  pageSize,
  prefs,
  searchQuery = "",
  onWidthsChange,
  onRowClick,
  onRowDoubleClick,
  resetKey,
}: {
  data: SheetGridData | null;
  loading?: boolean;
  refreshing?: boolean;
  switching?: boolean;
  pageSize: number;
  prefs: SheetGridColumnPrefs;
  searchQuery?: string;
  onWidthsChange: (widths: Record<string, number>) => void;
  onRowClick?: (rowIndex: number) => void;
  onRowDoubleClick?: (rowIndex: number) => void;
  resetKey: string;
}) {
  const resizeRef = useRef<{ index: number; startX: number; startW: number; base: Record<string, number> } | null>(
    null,
  );
  const dragWidthsRef = useRef<Record<string, number> | null>(null);
  const [dragWidths, setDragWidths] = useState<Record<string, number> | null>(null);
  const widthsRef = useRef(prefs.widths);
  widthsRef.current = prefs.widths;
  const wrap = prefs.wrap !== false;
  const textAlign = prefs.textAlign ?? "left";
  const alignClass = `sheet-grid-table--align-${textAlign}`;
  const hidden = useMemo(() => new Set(prefs.hidden), [prefs.hidden]);

  const visibleIndices = useMemo(
    () => data?.header.map((_, i) => i).filter((i) => !hidden.has(i)) ?? [],
    [data?.header, hidden],
  );

  const lastVisibleIndex = visibleIndices[visibleIndices.length - 1];

  const effectiveWidths = dragWidths ?? prefs.widths;
  const weighted = prefs.columnFit === "weighted";
  const sizedColumns = weighted || dragWidths != null;

  const colWidth = useCallback(
    (index: number) => {
      const w = effectiveWidths[String(index)];
      return typeof w === "number" && w >= SHEET_GRID_MIN_COL_WIDTH ? w : SHEET_GRID_DEFAULT_COL_WIDTH;
    },
    [effectiveWidths],
  );

  const colPixelWidth = useCallback(
    (index: number) => {
      if (!sizedColumns) return undefined;
      return colWidth(index);
    },
    [colWidth, sizedColumns],
  );

  const seedWidthsFromRow = useCallback(
    (row: HTMLTableRowElement | null, base: Record<string, number>) => {
      const next = { ...base };
      const ths = row?.querySelectorAll("th");
      visibleIndices.forEach((colIndex, idx) => {
        if (colIndex === lastVisibleIndex) return;
        const key = String(colIndex);
        const saved = next[key];
        if (typeof saved === "number" && saved >= SHEET_GRID_MIN_COL_WIDTH) return;
        const measured = ths?.[idx]?.getBoundingClientRect().width;
        next[key] =
          measured != null && measured >= SHEET_GRID_MIN_COL_WIDTH
            ? Math.round(measured)
            : SHEET_GRID_DEFAULT_COL_WIDTH;
      });
      return next;
    },
    [lastVisibleIndex, visibleIndices],
  );

  const onResizePointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLTableCellElement>) => {
      if (index === lastVisibleIndex) return;
      const th = e.currentTarget;
      const rect = th.getBoundingClientRect();
      const fromRight = rect.right - e.clientX;
      if (fromRight > 16 || fromRight < 0) return;
      e.preventDefault();
      e.stopPropagation();
      const row = th.closest("tr");
      const base = seedWidthsFromRow(row, { ...widthsRef.current });
      const measured = th.getBoundingClientRect().width;
      const startW =
        typeof base[String(index)] === "number" && base[String(index)]! >= SHEET_GRID_MIN_COL_WIDTH
          ? base[String(index)]!
          : measured >= SHEET_GRID_MIN_COL_WIDTH
            ? Math.round(measured)
            : SHEET_GRID_DEFAULT_COL_WIDTH;
      const pointerId = e.pointerId;
      resizeRef.current = { index, startX: e.clientX, startW, base };
      const seed = { ...base, [String(index)]: startW };
      dragWidthsRef.current = seed;
      setDragWidths(seed);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (ev: PointerEvent) => {
        const cur = resizeRef.current;
        if (!cur || ev.pointerId !== pointerId) return;
        ev.preventDefault();
        const nextW = Math.max(SHEET_GRID_MIN_COL_WIDTH, cur.startW + (ev.clientX - cur.startX));
        const next = { ...cur.base, [String(cur.index)]: nextW };
        dragWidthsRef.current = next;
        setDragWidths(next);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.removeEventListener("pointercancel", onUp);
        resizeRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        const final = dragWidthsRef.current;
        dragWidthsRef.current = null;
        setDragWidths(null);
        if (final) onWidthsChange(final);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.body.addEventListener("pointercancel", onUp);
    },
    [lastVisibleIndex, onWidthsChange, seedWidthsFromRow],
  );

  const onThPointerMove = useCallback(
    (index: number, e: ReactPointerEvent<HTMLTableCellElement>) => {
      if (index === lastVisibleIndex || resizeRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const fromRight = rect.right - e.clientX;
      e.currentTarget.style.cursor = fromRight <= 16 && fromRight >= 0 ? "col-resize" : "";
    },
    [lastVisibleIndex],
  );

  const onThPointerLeave = useCallback((e: ReactPointerEvent<HTMLTableCellElement>) => {
    if (!resizeRef.current) e.currentTarget.style.cursor = "";
  }, []);

  useEffect(() => {
    return () => {
      resizeRef.current = null;
      dragWidthsRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const indexedRows = useMemo(
    () => data?.rows.map((row, index) => ({ row, index })) ?? [],
    [data?.rows],
  );

  const rowHeight = wrap ? SHEET_GRID_ROW_HEIGHT.wrap : SHEET_GRID_ROW_HEIGHT.truncate;
  const { scrollRef, enabled: virtualEnabled, visible, padTop, padBottom } = useSheetGridVirtualWindow(
    indexedRows,
    rowHeight,
  );

  if (!data) {
    if (loading) {
      return (
        <div className="sheet-grid-loading flex min-h-[240px] flex-1 items-center justify-center p-6 text-center text-[12px] text-[var(--muted)]">
          Loading sheet…
        </div>
      );
    }
    return (
      <div className="sheet-grid-empty flex min-h-[240px] flex-1 items-center justify-center p-6 text-center text-[12px] text-[var(--muted)]">
        Paste Google Sheet link để xem dữ liệu.
      </div>
    );
  }

  const tableClass = wrap
    ? `${SHEET_DIRECTORY_TABLE_BASE_CLASS} sheet-grid-table sheet-grid-table--wrap${sizedColumns ? " sheet-grid-table--sized" : ""} ${alignClass}`
    : `${SHEET_DIRECTORY_TABLE_BASE_CLASS} sheet-grid-table sheet-grid-table--fill${sizedColumns && !wrap ? " sheet-grid-table--wide" : ""} ${alignClass}`;

  const wrapClassName = `hub-users-table-wrap ${SHEET_DIRECTORY_TABLE_WRAP_PANEL_CLASS}`;

  const renderColgroup = () => (
    <colgroup>
      {visibleIndices.map((i, idx) => {
        const isLast = idx === visibleIndices.length - 1;
        if (!sizedColumns || isLast) {
          return <col key={String(i)} />;
        }
        const px = colPixelWidth(i);
        return <col key={String(i)} style={px ? { width: `${px}px` } : undefined} />;
      })}
    </colgroup>
  );

  const headRow = (
    <tr>
      {visibleIndices.map((i) => {
        const resizable = i !== lastVisibleIndex;
        return (
          <th
            key={String(i)}
            className={`sheet-grid-th${resizable ? " sheet-grid-th--resizable" : ""}`}
            scope="col"
            onPointerDown={resizable ? (e) => onResizePointerDown(i, e) : undefined}
            onPointerMove={resizable ? (e) => onThPointerMove(i, e) : undefined}
            onPointerLeave={resizable ? onThPointerLeave : undefined}
          >
            <span className="hub-users-th-btn hub-users-th-btn--static">
              <span className="hub-users-th-label">
                <HubTableColumnHeader label={data.header[i] ?? ""} role={resolveSheetGridHeaderRole(data.header[i] ?? "")} />
              </span>
            </span>
          </th>
        );
      })}
    </tr>
  );

  const renderBodyRows = (pageRows: readonly IndexedRow[]) => {
    if (pageRows.length === 0) {
      return (
        <tr>
          <td colSpan={visibleIndices.length || 1} className="px-3 py-8 text-center text-[12px] text-[var(--muted)]">
            No rows match search or filters.
          </td>
        </tr>
      );
    }

    if (virtualEnabled) {
      const colSpan = visibleIndices.length || 1;
      return (
        <>
          {padTop > 0 ? (
            <tr aria-hidden className="sheet-grid-virtual-pad">
              <td colSpan={colSpan} style={{ height: padTop, padding: 0, border: 0 }} />
            </tr>
          ) : null}
          {visible.map(({ item: { row, index: globalIndex } }) =>
            renderSheetGridBodyRow({
              row,
              globalIndex,
              visibleIndices,
              wrap,
              searchQuery,
              onRowClick,
              onRowDoubleClick,
            }),
          )}
          {padBottom > 0 ? (
            <tr aria-hidden className="sheet-grid-virtual-pad">
              <td colSpan={colSpan} style={{ height: padBottom, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </>
      );
    }

    return pageRows.map(({ row, index: globalIndex }) =>
      renderSheetGridBodyRow({
        row,
        globalIndex,
        visibleIndices,
        wrap,
        searchQuery,
        onRowClick,
        onRowDoubleClick,
      }),
    );
  };

  const tableContent = (pageRows: readonly IndexedRow[]) => (
    <>
      <DirectoryInlineTable
        wrapClassName={wrapClassName}
        tableClassName={tableClass}
        showSelect={false}
        colgroup={renderColgroup()}
        headRow={headRow}
        bodyRows={renderBodyRows(pageRows)}
        emptyMessage="No rows match search or filters."
        hasRows={pageRows.length > 0}
      />
      {switching ? (
        <div className="sheet-grid-switch-overlay" aria-hidden>
          <div className="sheet-grid-switch-overlay__pulse" />
        </div>
      ) : null}
    </>
  );

  const shellClass = `sheet-grid-shell flex min-h-0 flex-1 flex-col${refreshing ? " sheet-grid-shell--refreshing" : ""}${switching ? " sheet-grid-shell--switching" : ""}`;

  if (virtualEnabled) {
    return (
      <div className={shellClass}>
        <div ref={scrollRef} className={`${wrapClassName} min-h-0 flex-1 overflow-auto`}>
          <table className={tableClass}>
            {renderColgroup()}
            <thead>{headRow}</thead>
            <tbody>{renderBodyRows(indexedRows)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <HubPaginatedTableShell
      items={indexedRows}
      ariaLabel="Sheet rows pages"
      pageSize={pageSize}
      resetKey={resetKey}
      className={shellClass}
    >
      {(pageRows) => tableContent(pageRows)}
    </HubPaginatedTableShell>
  );
}
