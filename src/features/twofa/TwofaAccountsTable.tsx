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
import { TWOFA_COLUMN_ROLE, twofaColumnLabel } from "./twofa-column-meta";

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
  { key: "service", label: twofaColumnLabel("service"), colClass: "hub-users-col--twofa-service", role: TWOFA_COLUMN_ROLE.service, width: "12%", headerAlign: "start" },
  { key: "browser", label: twofaColumnLabel("browser"), colClass: "hub-users-col--twofa-browser", role: TWOFA_COLUMN_ROLE.browser, width: "7%", headerAlign: "center" },
  { key: "account", label: twofaColumnLabel("account"), colClass: "hub-users-col--twofa-account", role: TWOFA_COLUMN_ROLE.account, width: "16%", headerAlign: "start" },
  { key: "status", label: twofaColumnLabel("status"), colClass: "hub-users-col--twofa-status", role: TWOFA_COLUMN_ROLE.status, width: "9rem", headerAlign: "start" },
  { key: "password", label: twofaColumnLabel("password"), colClass: "hub-users-col--twofa-password", role: TWOFA_COLUMN_ROLE.password, width: "10%", headerAlign: "start" },
  { key: "secret", label: twofaColumnLabel("secret"), colClass: "hub-users-col--twofa-secret", role: TWOFA_COLUMN_ROLE.secret, width: "11%", headerAlign: "start" },
  { key: "code", label: twofaColumnLabel("code"), colClass: "hub-users-col--twofa-code", role: TWOFA_COLUMN_ROLE.code, width: "4.5rem", headerAlign: "start" },
  { key: "period", label: twofaColumnLabel("period"), colClass: "hub-users-col--twofa-period", role: TWOFA_COLUMN_ROLE.period, width: "5rem", headerAlign: "center" },
  { key: "note", label: twofaColumnLabel("note"), colClass: "hub-users-col--twofa-note", role: TWOFA_COLUMN_ROLE.note, width: "11%", headerAlign: "start" },
  { key: "log", label: twofaColumnLabel("log"), colClass: "hub-users-col--twofa-log", role: TWOFA_COLUMN_ROLE.log, width: "14%", headerAlign: "start" },
  { key: "created", label: twofaColumnLabel("created"), colClass: "hub-users-col--twofa-created", role: TWOFA_COLUMN_ROLE.created, width: "6.25rem", headerAlign: "center" },
  { key: "updated", label: twofaColumnLabel("updated"), colClass: "hub-users-col--twofa-updated", role: TWOFA_COLUMN_ROLE.updated, width: "6.25rem", headerAlign: "center" },
];

const NON_SORTABLE_COLUMNS = new Set<ColumnKey>(["code", "period"]);

/** Golden 2FA directory table — HubDirectoryTableShell only (no virtual bypass). */
export function TwofaAccountsTable({
  rows,
  detailId,
  visibleColumns,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  onUsed,
  onOpenAccount,
  sortKey,
  sortDir,
  onSort,
  resetKey,
}: {
  rows: TwofaAccount[];
  detailId: string | null;
  visibleColumns: Set<TwofaTableColumnKey>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onUsed: (id: string) => void;
  onOpenAccount: (row: TwofaAccount) => void;
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
      ariaLabel="Account vault table pages"
      wrapClassName="overflow-hidden"
      tableClassName={`${hubDirectoryTableClass("default")} hub-users-table--twofa`}
      colgroup={colgroup}
      columns={shellColumns}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(row) => row.id}
      onRowClick={onOpenAccount}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onToggleSelectAll={onToggleSelectAll}
      allVisibleSelected={allVisibleSelected}
      selectAllLabel="Select all accounts on this page"
      emptyMessage="No accounts match search or filters."
      getRowClassName={(row) => (detailId === row.id ? " is-detail" : "")}
      renderRowCells={(row) =>
        shellColumns.map((col) => renderTwofaAccountsDirectoryBodyCell(col, row, onUsed))
      }
    />
  );
}
