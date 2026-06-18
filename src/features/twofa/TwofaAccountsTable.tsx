import { useMemo } from "react";
import {
  HubDirectoryTableShell,
  buildDirectoryColgroup,
  hubDirectoryTableClass,
  type HubSortDir,
  type HubTableColumnRole,
} from "@tool-workspace/hub-ui";
import { renderTwofaAccountsDirectoryBodyCell } from "./twofa-accounts-directory-cells";
import "./twofa-platform-icon.css";
import "./twofa-table-cells.css";
import type { TwofaAccount } from "./types";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

type ColumnKey = TwofaTableColumnKey;

type ColumnDef = {
  key: ColumnKey;
  label: string;
  colClass: string;
  role: HubTableColumnRole;
  width: string;
  headerAlign?: "start" | "center";
};

const COLUMNS: ColumnDef[] = [
  { key: "service", label: "Service", colClass: "hub-users-col--twofa-service", role: "service", width: "14%", headerAlign: "start" },
  { key: "browser", label: "Browser", colClass: "hub-users-col--twofa-browser", role: "id", width: "8%", headerAlign: "center" },
  { key: "account", label: "Account", colClass: "hub-users-col--twofa-account", role: "email", width: "18%", headerAlign: "start" },
  { key: "password", label: "Password", colClass: "hub-users-col--twofa-password", role: "password", width: "12%", headerAlign: "start" },
  { key: "secret", label: "Secret", colClass: "hub-users-col--twofa-secret", role: "id", width: "12%", headerAlign: "start" },
  { key: "code", label: "Code", colClass: "hub-users-col--twofa-code", role: "code", width: "4.5rem", headerAlign: "start" },
  { key: "period", label: "Time", colClass: "hub-users-col--twofa-period", role: "period", width: "5rem", headerAlign: "center" },
  { key: "created", label: "Created", colClass: "hub-users-col--twofa-created", role: "created", width: "6.25rem", headerAlign: "center" },
  { key: "used", label: "Last used", colClass: "hub-users-col--twofa-used", role: "activity", width: "6.25rem", headerAlign: "center" },
];

const NON_SORTABLE_COLUMNS = new Set<ColumnKey>(["code", "period"]);

/** Golden 2FA directory table — HubDirectoryTableShell only (no virtual bypass). */
export function TwofaAccountsTable({
  rows,
  editingId,
  visibleColumns,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  onUsed,
  sortKey,
  sortDir,
  onSort,
  resetKey,
}: {
  rows: TwofaAccount[];
  editingId: string | null;
  visibleColumns: Set<TwofaTableColumnKey>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onUsed: (id: string) => void;
  sortKey: ColumnKey;
  sortDir: HubSortDir;
  onSort: (key: ColumnKey) => void;
  resetKey?: string | number | boolean | null;
}) {
  const visibleDefs = useMemo(
    () => COLUMNS.filter((col) => visibleColumns.has(col.key)),
    [visibleColumns],
  );

  const shellColumns = useMemo(
    () =>
      visibleDefs.map((col) => ({
        key: col.key,
        label: col.label,
        role: col.role,
        colClass: col.colClass,
        width: col.width,
        sortable: !NON_SORTABLE_COLUMNS.has(col.key),
        headerAlign: col.headerAlign,
      })),
    [visibleDefs],
  );

  const colgroup = useMemo(
    () => buildDirectoryColgroup(shellColumns, { includeSelect: true }),
    [shellColumns],
  );

  return (
    <HubDirectoryTableShell
      items={rows}
      resetKey={resetKey}
      ariaLabel="2FA accounts table pages"
      wrapClassName="overflow-hidden"
      tableClassName={`${hubDirectoryTableClass("default")} hub-users-table--twofa`}
      colgroup={colgroup}
      columns={shellColumns}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(row) => row.id}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      allVisibleSelected={allVisibleSelected}
      selectAllLabel="Select all accounts on this page"
      emptyMessage="No accounts match search or filters."
      getRowClassName={(row) =>
        ` hub-users-row--static${editingId === row.id ? " is-editing" : ""}`
      }
      renderRowCells={(row) =>
        shellColumns.map((col) => renderTwofaAccountsDirectoryBodyCell(col, row, onUsed))
      }
    />
  );
}
