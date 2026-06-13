import { useMemo } from "react";
import {
  HubDirectoryTableShell,
  buildDirectoryColgroup,
  hubDirectoryTableClass,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import type { CookieListSort } from "./cookie-list-prefs";
import type { CookieAutoRow } from "./cookieAutoRow";
import { renderCookieRoutesDirectoryBodyCell } from "./cookie-routes-directory-cells";
import type { CookieVaultRow } from "./useCookieVaultMap";

const ROUTE_COLUMNS = [
  { key: "updated" as const, label: "Status", role: "status" as const, colClass: "min-w-[220px]" },
  { key: "title" as const, label: "Route", role: "route" as const, colClass: "" },
  { key: "platform" as const, label: "URL / ID", role: "url" as const, colClass: "" },
  { key: "created" as const, label: "Vault", role: "vault" as const, colClass: "w-28" },
  {
    key: "owner" as const,
    label: "Owner / Browser",
    role: "source" as const,
    colClass: "w-36",
    sortable: false as const,
  },
] as const;

type CookieRouteTableSortKey = CookieListSort | "owner";

const SHELL_COLUMNS = ROUTE_COLUMNS.map((col) => ({
  key: col.key as CookieRouteTableSortKey,
  label: col.label,
  role: col.role,
  colClass: col.colClass,
  sortable: !("sortable" in col && col.sortable === false),
}));

function cookieRowClassName(
  bindingId: string,
  selectedSet: Set<string>,
  selectedBindingId?: string | null,
) {
  const checked = selectedSet.has(bindingId);
  const selected = selectedBindingId === bindingId;
  return checked || selected
    ? " border-b border-white/5 last:border-0 bg-cyan-500/[.06] outline outline-1 outline-cyan-400/20 hover:bg-white/[.02]"
    : " border-b border-white/5 last:border-0 hover:bg-white/[.02]";
}

type TableProps = {
  rows: CookieAutoRow[];
  resetKey?: string | number | boolean | null;
  loading?: boolean;
  totalRowCount: number;
  selectedIds: string[];
  selectedBindingId?: string | null;
  vaultByKey: Record<string, CookieVaultRow>;
  sortKey: CookieListSort;
  sortDir: HubSortDir;
  onSort: (key: CookieListSort) => void;
  onSelect?: (bindingId: string) => void;
  onOpenDetail?: (bindingId: string, noteId: string) => void;
  onToggleSelect: (bindingId: string, checked: boolean) => void;
};

/** Golden cookie route directory table — HubDirectoryTableShell only (P0004 Users parity). */
export function CookieRoutesDirectoryTable(props: TableProps) {
  const {
    rows,
    resetKey,
    loading,
    totalRowCount,
    selectedIds,
    selectedBindingId,
    vaultByKey,
    sortKey,
    sortDir,
    onSort,
    onSelect,
    onOpenDetail,
    onToggleSelect,
  } = props;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const colgroup = useMemo(
    () => buildDirectoryColgroup(SHELL_COLUMNS, { includeSelect: true }),
    [],
  );
  const emptyMessage =
    totalRowCount === 0 ? "No active routes — click Add route." : "No routes match search or filters.";

  return (
    <HubDirectoryTableShell
      items={rows}
      resetKey={resetKey}
      ariaLabel="Route table pages"
      tableClassName={`${hubDirectoryTableClass("default")} hub-users-table--cookie-routes min-w-[980px]`}
      wrapClassName="overflow-hidden"
      colgroup={colgroup}
      columns={SHELL_COLUMNS}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={(key) => {
        if (key === "owner") return;
        onSort(key as CookieListSort);
      }}
      getRowKey={(row) => row.binding.id}
      selectedIds={selectedSet}
      onToggleSelect={(id) => onToggleSelect(id, !selectedSet.has(id))}
      selectAllLabel="Select all routes on this page"
      emptyMessage={loading ? "Loading routes…" : emptyMessage}
      onRowClick={(row) => {
        onOpenDetail?.(row.binding.id, row.binding.noteId);
        onSelect?.(row.binding.id);
      }}
      getRowClassName={(row) =>
        cookieRowClassName(row.binding.id, selectedSet, selectedBindingId)
      }
      renderRowCells={(row) =>
        SHELL_COLUMNS.map((col) => renderCookieRoutesDirectoryBodyCell(col, row, vaultByKey))
      }
    />
  );
}
