import { useMemo } from "react";
import { HubDirectoryTableShell, type HubSortDir } from "@tool-workspace/hub-ui";
import type { CookieListSort } from "./cookie-list-prefs";
import { LockKeyhole } from "lucide-react";
import { MetricBadge } from "../../components/sales-shell";
import { formatTimestampCompact, formatTimestampCompactOrDash } from "../../lib/format-timestamp";
import { CookieRouteChipRow } from "./CookieRouteChipRow";
import type { CookieAutoRow } from "./cookieAutoRow";
import { resolveCookieRouteOwnerLabel } from "./cookie-route-owner";
import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import { resolveRouteSyncedDisplayIso } from "./route-sync-display";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { lookupVaultRow } from "./useCookieVaultMap";

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

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "";
}

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

function renderCookieRouteDataCells(
  row: CookieAutoRow,
  vaultByKey: Record<string, CookieVaultRow>,
) {
  const { binding, note, lines } = row;
  const status = note?.sync_status ?? "pending";
  const vault = binding.noteId
    ? lookupVaultRow(vaultByKey, binding.noteId, binding.domain)
    : undefined;
  const icon = resolveCookieSiteIcon(binding.domain);
  const syncedIso = resolveRouteSyncedDisplayIso({ noteSyncedAt: note?.synced_at });

  return (
    <>
      <td className="px-2 py-2 align-top">
        <CookieRouteChipRow
          binding={binding}
          syncStatus={status}
          noteSyncedAt={note?.synced_at}
          vaultCookieCount={vault?.cookie_count}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 align-top">
        <div className="flex items-center gap-2 font-medium text-[var(--text)]">
          {icon ? (
            <img
              src={icon.src}
              alt={icon.label}
              className="h-4 w-4 object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span>{binding.noteTitle ?? note?.title ?? "Untitled route"}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-indigo-300/90">{binding.domain}</div>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="flex flex-wrap items-center gap-1.5">
          <code className="rounded bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
            {binding.syncId || (binding.useNoteIdRpc ? "by UUID" : "—")}
          </code>
          <code className="rounded bg-white/[.04] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
            {binding.noteId ? `${binding.noteId.slice(0, 8)}…` : "no note"}
          </code>
        </div>
        <div className="mt-1 text-[10px] text-[var(--muted)]">
          {lines.length ? `${lines.length} cookie line(s)` : "Awaiting snapshot"} ·{" "}
          {note?.syncLabel ?? "not synced"}
        </div>
        {syncedIso ? (
          <div className="mt-0.5 text-[9px] text-indigo-300/70" title={syncedIso}>
            {formatTimestampCompact(syncedIso)}
          </div>
        ) : null}
      </td>
      <td className="px-2 py-2 align-top text-[11px]">
        {vault ? (
          <div>
            <div className="text-[11px] font-medium text-[var(--text)]">
              {vault.cookie_count} cookie{vault.cookie_count === 1 ? "" : "s"}
            </div>
            <div className="mt-1 text-[10px] text-[var(--muted)]">
              {formatTimestampCompactOrDash(vault.updated_at)}
            </div>
            {vault.updated_by ? (
              <div
                className="mt-0.5 max-w-[120px] truncate text-[9px] text-amber-200/80"
                title={vault.updated_by}
              >
                {vault.updated_by}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="text-[var(--muted)]">No vault</span>
        )}
      </td>
      <td className="px-2 py-2 align-top text-[10px]">
        {binding.sourceBrowserId ? (
          <div>
            <MetricBadge
              label={shortId(binding.sourceBrowserId)}
              tone="ok"
              iconMeta={{ icon: LockKeyhole, className: "text-emerald-300" }}
              mono
            />
            {binding.sourceLabel ? (
              <div className="mt-1 max-w-[150px] truncate text-[var(--muted)]" title={binding.sourceLabel}>
                {binding.sourceLabel}
              </div>
            ) : null}
          </div>
        ) : (
          <div>
            <MetricBadge label="Owner" tone="ok" />
            <div
              className="mt-1 max-w-[150px] truncate text-[var(--muted)]"
              title={binding.ownerUserId ?? undefined}
            >
              Owner {resolveCookieRouteOwnerLabel(binding)}
            </div>
          </div>
        )}
      </td>
    </>
  );
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
    onToggleSelect,
  } = props;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const emptyMessage =
    totalRowCount === 0 ? "No active routes — click Add route." : "No routes match search or filters.";

  return (
    <HubDirectoryTableShell
      items={rows}
      resetKey={resetKey}
      ariaLabel="Route table pages"
      tableClassName="hub-users-table hub-users-table--cookie-routes min-w-[980px]"
      wrapClassName="overflow-hidden"
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
      onRowClick={(row) => onSelect?.(row.binding.id)}
      getRowClassName={(row) =>
        cookieRowClassName(row.binding.id, selectedSet, selectedBindingId)
      }
      renderRowCells={(row) => renderCookieRouteDataCells(row, vaultByKey)}
    />
  );
}
