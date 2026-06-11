import { useMemo } from "react";
import { HubDirectoryTableShell, type HubSortDir, type HubTableColumnRole } from "@tool-workspace/hub-ui";
import { TwofaPlatformIcon } from "./TwofaPlatformIcon";
import "./twofa-platform-icon.css";
import "./twofa-table-cells.css";
import {
  TwofaAccountCell,
  TwofaBrowserCell,
  TwofaCodeCell,
  TwofaPasswordCell,
  TwofaPeriodCell,
  TwofaSecretCell,
} from "./twofa-copy-cells";
import type { TwofaAccount } from "./types";
import { fmtHubDate, twofaActivityAt } from "./twofa-time";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

type ColumnKey = TwofaTableColumnKey;

type ColumnDef = {
  key: ColumnKey;
  label: string;
  colClass: string;
  role: HubTableColumnRole;
  headerAlign?: "start" | "center";
};

const COLUMNS: ColumnDef[] = [
  { key: "service", label: "Service", colClass: "hub-users-col--twofa-service", role: "service", headerAlign: "start" },
  { key: "browser", label: "Browser", colClass: "hub-users-col--twofa-browser", role: "id", headerAlign: "center" },
  { key: "account", label: "Account", colClass: "hub-users-col--twofa-account", role: "email", headerAlign: "start" },
  { key: "password", label: "Password", colClass: "hub-users-col--twofa-password", role: "password", headerAlign: "start" },
  { key: "secret", label: "Secret", colClass: "hub-users-col--twofa-secret", role: "id", headerAlign: "start" },
  { key: "code", label: "Code", colClass: "hub-users-col--twofa-code", role: "code", headerAlign: "start" },
  { key: "period", label: "Time", colClass: "hub-users-col--twofa-period", role: "period", headerAlign: "center" },
  { key: "created", label: "Created", colClass: "hub-users-col--twofa-created", role: "created", headerAlign: "center" },
  { key: "used", label: "Last used", colClass: "hub-users-col--twofa-used", role: "activity", headerAlign: "center" },
];

const NON_SORTABLE_COLUMNS = new Set<ColumnKey>(["code", "period"]);

function renderBodyCell(key: ColumnKey, row: TwofaAccount, onUsed: (id: string) => void) {
  switch (key) {
    case "service":
      return (
        <td key={key} className="hub-users-col--twofa-service">
          <div className="hub-users-cell-name">
            <TwofaPlatformIcon service={row.service} />
            <span className="hub-users-name-title" title={row.service}>
              {row.service}
            </span>
          </div>
        </td>
      );
    case "browser":
      return (
        <td key={key} className="hub-users-col--twofa-browser">
          <TwofaBrowserCell account={row} />
        </td>
      );
    case "account":
      return (
        <td key={key} className="hub-users-col--twofa-account">
          <TwofaAccountCell account={row} />
        </td>
      );
    case "password":
      return (
        <td key={key} className="hub-users-col--twofa-password">
          <TwofaPasswordCell account={row} />
        </td>
      );
    case "secret":
      return (
        <td key={key} className="hub-users-col--twofa-secret">
          <TwofaSecretCell account={row} />
        </td>
      );
    case "code":
      return (
        <td key={key} className="hub-users-col--twofa-code">
          <TwofaCodeCell account={row} onUsed={onUsed} />
        </td>
      );
    case "period":
      return (
        <td key={key} className="hub-users-col--twofa-period">
          <TwofaPeriodCell />
        </td>
      );
    case "created":
      return (
        <td key={key} className="hub-users-cell-muted hub-users-col--twofa-created">
          <span className="line-clamp-1">{fmtHubDate(row.createdAt)}</span>
        </td>
      );
    case "used":
      return (
        <td key={key} className="hub-users-cell-muted hub-users-col--twofa-used">
          <span className="line-clamp-1">{fmtHubDate(twofaActivityAt(row))}</span>
        </td>
      );
    default:
      return null;
  }
}

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
        sortable: !NON_SORTABLE_COLUMNS.has(col.key),
        headerAlign: col.headerAlign,
      })),
    [visibleDefs],
  );

  return (
    <HubDirectoryTableShell
      items={rows}
      resetKey={resetKey}
      ariaLabel="2FA accounts table pages"
      wrapClassName="overflow-hidden"
      tableClassName="hub-users-table hub-users-table--twofa"
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
      renderRowCells={(row) => visibleDefs.map((col) => renderBodyCell(col.key, row, onUsed))}
    />
  );
}
