/** read-only-directory — dynamic CSV columns; copy-on-click cells. */
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  DirectorySplitScrollTable,
  DirectoryTableBodyCell,
  HubPaginatedTableShell,
  hubDirectoryTableClass,
} from "@tool-workspace/hub-ui";
import { SHEET_DIRECTORY_TABLE_WRAP_PANEL_CLASS } from "./sheet-directory-table";
import {
  SHEET_GRID_DEFAULT_COL_WIDTH,
  SHEET_GRID_MIN_COL_WIDTH,
  type SheetGridColumnPrefs,
} from "./sheet-grid-prefs";
import type { SheetGridData } from "./sheet-grid-types";

export type { SheetGridData } from "./sheet-grid-types";

export function SheetGridTable({
  data,
  pageSize,
  prefs,
  onWidthsChange,
  onCopyCell,
  resetKey,
}: {
  data: SheetGridData | null;
  pageSize: number;
  prefs: SheetGridColumnPrefs;
  onWidthsChange: (widths: Record<string, number>) => void;
  onCopyCell: (value: string) => void;
  resetKey: string;
}) {
  const resizeRef = useRef<{ index: number; startX: number; startW: number; base: Record<string, number> } | null>(
    null,
  );
  const splitScrollRef = useRef<HTMLDivElement>(null);
  const dragWidthsRef = useRef<Record<string, number> | null>(null);
  const [dragWidths, setDragWidths] = useState<Record<string, number> | null>(null);
  const widthsRef = useRef(prefs.widths);
  widthsRef.current = prefs.widths;
  const wrap = Boolean(prefs.wrap);
  const textAlign = prefs.textAlign ?? "center";
  const alignClass = `sheet-grid-table--align-${textAlign}`;
  const hidden = useMemo(() => new Set(prefs.hidden), [prefs.hidden]);

  const visibleIndices = useMemo(
    () => data?.header.map((_, i) => i).filter((i) => !hidden.has(i)) ?? [],
    [data?.header, hidden],
  );

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

  const onResizePointerDown = useCallback(
    (index: number, e: ReactPointerEvent<HTMLSpanElement>) => {
      if (index === visibleIndices[visibleIndices.length - 1]) return;
      e.preventDefault();
      e.stopPropagation();
      const base = { ...widthsRef.current };
      const th = e.currentTarget.closest("th");
      const measured = th?.getBoundingClientRect().width;
      const startW =
        typeof base[String(index)] === "number" && base[String(index)]! >= SHEET_GRID_MIN_COL_WIDTH
          ? base[String(index)]!
          : measured != null && measured >= SHEET_GRID_MIN_COL_WIDTH
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
    },
    [onWidthsChange, visibleIndices],
  );

  useEffect(() => {
    return () => {
      resizeRef.current = null;
      dragWidthsRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  useEffect(() => {
    const root = splitScrollRef.current;
    if (!root) return;
    const body = root.querySelector<HTMLElement>(".hub-directory-table-body-scroll");
    const head = root.querySelector<HTMLElement>(".hub-directory-table-head");
    if (!body || !head) return;

    const syncHeadScroll = () => {
      head.scrollLeft = body.scrollLeft;
    };

    syncHeadScroll();
    body.addEventListener("scroll", syncHeadScroll, { passive: true });
    return () => body.removeEventListener("scroll", syncHeadScroll);
  }, [data?.header.length, visibleIndices.length, sizedColumns, wrap, resetKey]);

  if (!data) {
    return (
      <div className="sheet-grid-empty flex min-h-[240px] flex-1 items-center justify-center p-6 text-center text-[12px] text-[var(--muted)]">
        Paste Google Sheet link để xem dữ liệu.
      </div>
    );
  }

  const tableClass = wrap
    ? `${hubDirectoryTableClass("default")} sheet-grid-table sheet-grid-table--wrap${sizedColumns ? " sheet-grid-table--sized" : ""} ${alignClass}`
    : `${hubDirectoryTableClass("default")} sheet-grid-table sheet-grid-table--fill${sizedColumns && !wrap ? " sheet-grid-table--wide" : ""} ${alignClass}`;

  const wrapClassName = `hub-users-table-wrap hub-directory-table-split ${SHEET_DIRECTORY_TABLE_WRAP_PANEL_CLASS}`;

  const lastVisibleIndex = visibleIndices[visibleIndices.length - 1];

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
      {visibleIndices.map((i) => (
        <th key={String(i)} className="relative" scope="col">
          <span className="hub-users-th-btn hub-users-th-btn--static">
            <span className="hub-users-th-label">{data.header[i]}</span>
          </span>
          {i !== lastVisibleIndex ? (
            <span
              role="separator"
              aria-orientation="vertical"
              aria-label={`Resize ${data.header[i]} column`}
              className="sheet-grid-col-resize absolute right-0 top-0 h-full w-4 cursor-col-resize touch-none"
              onPointerDown={(e) => onResizePointerDown(i, e)}
            />
          ) : null}
        </th>
      ))}
    </tr>
  );

  return (
    <HubPaginatedTableShell
      items={data.rows}
      ariaLabel="Sheet rows pages"
      pageSize={pageSize}
      resetKey={resetKey}
      className="sheet-grid-shell flex min-h-0 flex-1 flex-col"
    >
      {(pageRows) => {
        const bodyRows =
          pageRows.length === 0 ? (
            <tr>
              <td
                colSpan={visibleIndices.length || 1}
                className="px-3 py-8 text-center text-[12px] text-[var(--muted)]"
              >
                No rows match search or filters.
              </td>
            </tr>
          ) : (
            pageRows.map((row, r) => (
              <tr key={String(r)} className="hub-users-row hub-users-row--static sheet-grid-row">
                {visibleIndices.map((c) => (
                  <DirectoryTableBodyCell
                    key={String(c)}
                    colClass="sheet-grid-td align-top"
                    onClick={() => onCopyCell(row[c] ?? "")}
                  >
                    <span className={wrap ? "sheet-grid-cell sheet-grid-cell--wrap" : "sheet-grid-cell truncate"}>
                      {row[c] ?? ""}
                    </span>
                  </DirectoryTableBodyCell>
                ))}
              </tr>
            ))
          );

        return (
          <div ref={splitScrollRef} className="sheet-grid-split min-h-0 min-w-0 flex flex-1 flex-col">
            <DirectorySplitScrollTable
              wrapClassName={wrapClassName}
              tableClassName={tableClass}
              showSelect={false}
              colgroup={renderColgroup()}
              headRow={headRow}
              bodyRows={bodyRows}
              emptyMessage="No rows match search or filters."
              hasRows={pageRows.length > 0}
            />
          </div>
        );
      }}
    </HubPaginatedTableShell>
  );
}
