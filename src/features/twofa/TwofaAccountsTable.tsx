import { memo, useMemo } from "react";
import { HubPaginatedTableShell, HubTableColumnHeader, type HubTableColumnRole } from "@tool-workspace/hub-ui";
import { TwofaPlatformIcon } from "./TwofaPlatformIcon";
import "./twofa-platform-icon.css";
import "./twofa-table-cells.css";
import {
  TwofaAccountCell,
  TwofaBrowserCell,
  TwofaCodeCell,
  TwofaPasswordCell,
  TwofaSecretCell,
} from "./twofa-copy-cells";
import type { TwofaAccount } from "./types";
import { secondsRemaining } from "./totp";
import { fmtHubDate, twofaActivityAt } from "./twofa-time";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

type ColumnKey = TwofaTableColumnKey;

type ColumnAlign = "left" | "center";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  colClass: string;
  align: ColumnAlign;
  role: HubTableColumnRole;
};

const COLUMNS: ColumnDef[] = [
  { key: "service", label: "Service", colClass: "hub-users-col--twofa-service", align: "left", role: "service" },
  { key: "browser", label: "Browser", colClass: "hub-users-col--twofa-browser", align: "center", role: "id" },
  { key: "account", label: "Account", colClass: "hub-users-col--twofa-account", align: "left", role: "email" },
  { key: "password", label: "Password", colClass: "hub-users-col--twofa-password", align: "left", role: "password" },
  { key: "secret", label: "Secret", colClass: "hub-users-col--twofa-secret", align: "left", role: "id" },
  { key: "code", label: "Code", colClass: "hub-users-col--twofa-code", align: "left", role: "code" },
  { key: "period", label: "Time", colClass: "hub-users-col--twofa-period", align: "center", role: "period" },
  { key: "created", label: "Created", colClass: "hub-users-col--twofa-created", align: "center", role: "created" },
  { key: "used", label: "Last used", colClass: "hub-users-col--twofa-used", align: "center", role: "activity" },
];

function thBtnClass(align: ColumnAlign) {
  return `hub-users-th-btn hub-users-th-btn--static${align === "left" ? " hub-users-th-btn--align-start" : ""}`;
}

function periodTone(secondsLeft: number): "fresh" | "warn" | "urgent" {
  if (secondsLeft > 20) return "fresh";
  if (secondsLeft > 10) return "warn";
  return "urgent";
}

const TwofaPeriodCell = memo(function TwofaPeriodCell({ tick }: { tick: number }) {
  void tick;
  const left = secondsRemaining();
  const tone = periodTone(left);
  return (
    <span className="hub-twofa-period-inline" title={`${left}s remaining`}>
      <span className={`hub-twofa-period-dot hub-twofa-period-dot--${tone}`} aria-hidden />
      <span className="hub-twofa-period-label tabular-nums">{left}s</span>
    </span>
  );
});

function renderBodyCell(
  key: ColumnKey,
  row: TwofaAccount,
  ctx: { tick: number; onUsed: (id: string) => void },
) {
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
          <TwofaCodeCell account={row} tick={ctx.tick} onUsed={ctx.onUsed} />
        </td>
      );
    case "period":
      return (
        <td key={key} className="hub-users-col--twofa-period">
          <TwofaPeriodCell tick={ctx.tick} />
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

type Props = {
  rows: TwofaAccount[];
  tick: number;
  editingId: string | null;
  visibleColumns: Set<TwofaTableColumnKey>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  onUsed: (id: string) => void;
};

const TwofaTableRow = memo(function TwofaTableRow({
  row,
  visibleDefs,
  tick,
  editingId,
  selected,
  onToggleSelect,
  onUsed,
}: {
  row: TwofaAccount;
  visibleDefs: ColumnDef[];
  tick: number;
  editingId: string | null;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onUsed: (id: string) => void;
}) {
  const ctx = { tick, onUsed };
  return (
    <tr
      className={`hub-users-row hub-users-row--static${selected ? " is-selected" : ""}${editingId === row.id ? " is-editing" : ""}`}
    >
      <td className="hub-users-col--select" onClick={(e) => e.stopPropagation()}>
        <label className="hub-users-select-row">
          <input
            type="checkbox"
            className="hub-checkbox"
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            aria-label={`Select ${row.service}`}
          />
        </label>
      </td>
      {visibleDefs.map((col) => renderBodyCell(col.key, row, ctx))}
    </tr>
  );
});

export function TwofaAccountsTable({
  rows,
  tick,
  editingId,
  visibleColumns,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  onUsed,
}: Props) {
  const visibleDefs = useMemo(
    () => COLUMNS.filter((col) => visibleColumns.has(col.key)),
    [visibleColumns],
  );

  return (
    <HubPaginatedTableShell items={rows} resetKey={rows.length} ariaLabel="2FA accounts table pages">
      {(pageRows) => (
    <div className="hub-users-table-wrap overflow-hidden rounded-2xl border border-white/5">
      <table className="hub-users-table hub-users-table--twofa">
        <colgroup>
          <col className="hub-users-col--select" />
          {visibleDefs.map((col) => (
            <col key={col.key} className={col.colClass} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="hub-users-col--select" scope="col">
              <label className="hub-users-select-all">
                <input
                  type="checkbox"
                  className="hub-checkbox"
                  checked={rows.length > 0 && allVisibleSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all visible accounts"
                />
              </label>
            </th>
            {visibleDefs.map((col) => (
              <th key={col.key} className={col.colClass} scope="col">
                <span className={thBtnClass(col.align)}>
                  <span className={`hub-users-th-label${col.align === "left" ? " hub-users-th-label--start" : ""}`}>
                    <HubTableColumnHeader label={col.label} role={col.role} />
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <TwofaTableRow
              key={row.id}
              row={row}
              visibleDefs={visibleDefs}
              tick={tick}
              editingId={editingId}
              selected={selectedIds.has(row.id)}
              onToggleSelect={onToggleSelect}
              onUsed={onUsed}
            />
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <div className="hub-users-empty">No accounts match search or filters.</div>
      ) : null}
    </div>
      )}
    </HubPaginatedTableShell>
  );
}
