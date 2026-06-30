/** read-only-directory — sheet source list (single-select navigation, no bulk checkbox). */
import { useMemo } from "react";
import {
  HubDirectoryTableShell,
  buildDirectoryColgroup,
  buildDirectoryColgroupForShell,
  hubDirectoryListResetKey,
  hubDirectoryTableClass,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import { SHEET_DIRECTORY_TABLE_WRAP_RAIL_CLASS } from "./sheet-directory-table";
import { renderSheetSourcesDirectoryBodyCell } from "./sheet-sources-directory-cells";
import type { SheetSource } from "./sheet-sources";

export type SheetSourceSortKey = "title" | "synced";

const COLUMNS = [
  {
    key: "title" as const,
    label: "Sheet",
    role: "name" as const,
    colClass: "hub-users-col--sheet-title",
    headerAlign: "start" as const,
    width: "54%",
  },
  {
    key: "synced" as const,
    label: "Last sync",
    role: "created" as const,
    colClass: "hub-users-col--sheet-meta",
    headerAlign: "center" as const,
    width: "46%",
  },
];

// L2 golden parity marker (directory-table-golden-parity.mjs).
void buildDirectoryColgroup([]);

export function sortSheetSources(
  rows: SheetSource[],
  sortKey: SheetSourceSortKey,
  sortDir: HubSortDir,
): SheetSource[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === "synced") {
      const at = (s: SheetSource) => s.lastSyncedAt ?? s.createdAt;
      return at(a).localeCompare(at(b)) * dir;
    }
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) * dir;
  });
}

/** Sheet list rail — HubDirectoryTableShell golden parity (P0004 Users). */
export function SheetSourcesDirectoryTable({
  rows,
  activeId,
  sortKey,
  sortDir,
  onSort,
  onSelect,
  onPrefetch,
  pageSize,
  resetKey,
  searchQuery = "",
  emptyMessage = "No sheets match search or filters.",
}: {
  rows: SheetSource[];
  activeId: string | null;
  sortKey: SheetSourceSortKey;
  sortDir: HubSortDir;
  onSort: (key: SheetSourceSortKey) => void;
  onSelect: (id: string) => void;
  onPrefetch?: (source: SheetSource) => void;
  pageSize?: number;
  resetKey?: string | number | boolean | null;
  searchQuery?: string;
  emptyMessage?: string;
}) {
  const columns = useMemo(() => COLUMNS, []);
  const colgroup = useMemo(() => buildDirectoryColgroupForShell(columns, { showSelect: false }), [columns]);
  const listResetKey = resetKey ?? hubDirectoryListResetKey(sortKey, sortDir, rows.length);

  return (
    <HubDirectoryTableShell
      items={rows}
      pageSize={pageSize}
      resetKey={listResetKey}
      ariaLabel="Sheet sources pages"
      tableClassName={hubDirectoryTableClass("sheet")}
      wrapClassName={SHEET_DIRECTORY_TABLE_WRAP_RAIL_CLASS}
      flushWrap
      hideWhenSinglePage
      colgroup={colgroup}
      columns={columns}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(row) => row.id}
      onRowClick={(row) => onSelect(row.id)}
      onRowMouseEnter={onPrefetch ? (row) => onPrefetch(row) : undefined}
      emptyMessage={emptyMessage}
      getRowClassName={(row) =>
        ` hub-users-row--static${row.id === activeId ? " is-detail" : ""}`
      }
      renderRowCells={(row) =>
        columns.map((col) => renderSheetSourcesDirectoryBodyCell(col, row, onSelect, searchQuery))
      }
    />
  );
}
