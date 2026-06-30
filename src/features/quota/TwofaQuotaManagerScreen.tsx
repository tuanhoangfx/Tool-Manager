import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Upload } from "lucide-react";
import {
  HubDirectoryBulkActionBar,
  HubDirectoryTableShell,
  DirectoryTableBodyCell,
  buildDirectoryColgroup,
  hubDirectoryTableClass,
  useHubDirectorySelection,
  useDebouncedValue,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import { PageHeader } from "../../components/PageHeader";
import { useAppToast } from "../../components/toast";
import { useWorkspaceSearch } from "../workspace/WorkspaceSearchContext";
import { useP0020DirectoryChrome } from "../workspace/useP0020DirectoryChrome";
import { WorkspaceDirectorySearchToolbar } from "../workspace/WorkspaceDirectorySearchToolbar";
import { useTwofaAccounts } from "../twofa/useTwofaAccounts";
import type { TwofaAccount } from "../twofa/types";
import { filterTwofaVaultScope } from "../twofa/twofa-vault-scope";
import { twofaVaultUiCopy } from "../twofa/twofa-vault-config";
import { resolveQuotaPlatform, quotaPlatformLabel } from "./quota-platform";
import {
  formatPlanExpiry,
  formatQuotaSummary,
  primaryQuotaPercent,
  quotaStatusLabel,
} from "./quota-snapshot-view";
import {
  importCockpitBackupJson,
  isQuotaProbeApiLikelyAvailable,
  probeQuotaAccounts,
  syncCockpitQuotaLocal,
} from "./quota-api";
import { TwofaPlatformIcon } from "../twofa/TwofaPlatformIcon";
import "../twofa/twofa-platform-icon.css";
import "./quota-screen.css";

type QuotaColumnKey = "service" | "account" | "plan" | "tier" | "expires" | "quota" | "status" | "checked";

const COLUMNS = [
  { key: "service" as const, label: "Platform", width: "14%", role: "service" as const },
  { key: "account" as const, label: "Account", width: "16%", role: "email" as const },
  { key: "plan" as const, label: "Plan", width: "14%", role: "status" as const },
  { key: "tier" as const, label: "Tier", width: "10%", role: "status" as const },
  { key: "expires" as const, label: "Plan due", width: "11%", role: "updated" as const },
  { key: "quota" as const, label: "Quota", width: "18%", role: "status" as const },
  { key: "status" as const, label: "Probe", width: "9%", role: "status" as const },
  { key: "checked" as const, label: "Checked", width: "8%", role: "updated" as const },
];

function sortQuotaRows(rows: TwofaAccount[]): TwofaAccount[] {
  return [...rows].sort((a, b) => {
    const aPct = primaryQuotaPercent(a.quotaSnapshot) ?? -1;
    const bPct = primaryQuotaPercent(b.quotaSnapshot) ?? -1;
    if (bPct !== aPct) return bPct - aPct;
    return a.service.localeCompare(b.service);
  });
}

function matchesQuotaSearch(row: TwofaAccount, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    row.service,
    row.account,
    row.planPackage,
    row.planTier,
    row.planStatus,
    quotaPlatformLabel(resolveQuotaPlatform(row.service)),
    formatQuotaSummary(row.quotaSnapshot),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function renderQuotaCell(key: QuotaColumnKey, row: TwofaAccount) {
  const platform = resolveQuotaPlatform(row.service);
  const pct = primaryQuotaPercent(row.quotaSnapshot);
  const expiry = formatPlanExpiry(row.planExpiresAt);
  const checked = row.quotaCheckedAt
    ? new Date(row.quotaCheckedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  switch (key) {
    case "service":
      return (
        <span className="quota-platform-cell">
          <TwofaPlatformIcon service={row.service} />
          <span>{quotaPlatformLabel(platform)}</span>
        </span>
      );
    case "account":
      return row.account;
    case "plan":
      return row.planPackage ?? "—";
    case "tier":
      return row.planTier ?? row.quotaSnapshot?.tierLabel ?? "—";
    case "expires":
      return <span className={`quota-expiry quota-expiry--${expiry.tone}`}>{expiry.label}</span>;
    case "quota":
      return (
        <div className="quota-metric-cell">
          {pct != null ? (
            <div className="quota-bar" aria-hidden>
              <div className="quota-bar__fill" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          ) : null}
          <span className="quota-metric-text">{formatQuotaSummary(row.quotaSnapshot)}</span>
        </div>
      );
    case "status":
      return (
        <span className={`quota-status quota-status--${row.quotaStatus ?? "none"}`}>
          {quotaStatusLabel(row.quotaStatus)}
        </span>
      );
    case "checked":
      return <span className="quota-checked-cell">{checked}</span>;
    default:
      return "—";
  }
}

export function TwofaQuotaManagerScreen({
  shellMode,
  tabActive = true,
  query: queryProp = "",
}: {
  shellMode?: boolean;
  tabActive?: boolean;
  query?: string;
} = {}) {
  const { accounts, applyQuotaResults, applyCockpitImport } = useTwofaAccounts({ tabActive });
  const { pushToast } = useAppToast();
  const { query: wsQuery, setSectionRuleLabel } = useWorkspaceSearch();
  const query = shellMode ? wsQuery : queryProp;
  const debouncedQuery = useDebouncedValue(query, 200);
  const vaultCopy = twofaVaultUiCopy("quota");
  const [probing, setProbing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<"all" | "expiring" | "errors">("all");
  const [sortKey, setSortKey] = useState<QuotaColumnKey>("service");
  const [sortDir, setSortDir] = useState<HubSortDir>("asc");
  const backupInputRef = useRef<HTMLInputElement>(null);

  const onSort = useCallback((key: QuotaColumnKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const scoped = useMemo(() => filterTwofaVaultScope(accounts, "quota"), [accounts]);

  const filtered = useMemo(() => {
    let rows = scoped.filter((row) => matchesQuotaSearch(row, debouncedQuery));
    if (filter === "expiring") {
      rows = rows.filter((row) => {
        if (!row.planExpiresAt) return false;
        const days = Math.ceil((Date.parse(row.planExpiresAt) - Date.now()) / 86_400_000);
        return days <= 14;
      });
    } else if (filter === "errors") {
      rows = rows.filter(
        (row) =>
          row.quotaStatus === "error" ||
          row.quotaStatus === "no_credential" ||
          row.quotaStatus === "unsupported",
      );
    }
    return sortQuotaRows(rows);
  }, [scoped, filter, debouncedQuery]);

  const {
    selectedIds,
    selectedRows,
    allVisibleSelected,
    hasSelection,
    toggleSelect,
    toggleSelectAll,
  } = useHubDirectorySelection(filtered, (row) => row.id);

  const colgroup = useMemo(
    () =>
      buildDirectoryColgroup(
        COLUMNS.map((col) => ({ ...col, sortable: false, colClass: `hub-users-col--quota-${col.key}` })),
        { includeSelect: true },
      ),
    [],
  );

  useEffect(() => {
    setSectionRuleLabel(vaultCopy.sectionRuleLabel);
  }, [setSectionRuleLabel, vaultCopy.sectionRuleLabel]);

  const runProbe = useCallback(
    async (targets: TwofaAccount[]) => {
      if (!targets.length) return;
      if (!isQuotaProbeApiLikelyAvailable()) {
        pushToast("Live probe requires dev server (quota API auto-starts with pnpm dev)", "info");
        return;
      }
      setProbing(true);
      try {
        const results = await probeQuotaAccounts(
          targets.map((row) => ({
            id: row.id,
            service: row.service,
            password: row.password,
            note: row.note,
          })),
        );
        const changed = applyQuotaResults(results);
        pushToast(
          changed > 0 ? `Updated live quota for ${changed} account(s)` : "Probe finished — no changes",
          changed > 0 ? "success" : "info",
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        pushToast(msg, "error");
      } finally {
        setProbing(false);
      }
    },
    [applyQuotaResults, pushToast],
  );

  const applyCockpitOutcome = useCallback(
    (outcome: Awaited<ReturnType<typeof syncCockpitQuotaLocal>>) => {
      const changed = applyCockpitImport(outcome.patches);
      pushToast(
        `Cockpit Cursor/Gemini: ${outcome.cockpitCount} found — updated ${changed}, created ${outcome.created ?? 0}`,
        changed > 0 || (outcome.created ?? 0) > 0 ? "success" : "info",
      );
    },
    [applyCockpitImport, pushToast],
  );

  const syncFromCockpit = useCallback(async () => {
    if (!isQuotaProbeApiLikelyAvailable()) {
      pushToast("Cockpit sync requires dev quota API (pnpm dev)", "info");
      return;
    }
    setImporting(true);
    try {
      const outcome = await syncCockpitQuotaLocal();
      applyCockpitOutcome(outcome);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : String(err), "error");
    } finally {
      setImporting(false);
    }
  }, [applyCockpitOutcome, pushToast]);

  const onBackupFile = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const text = await file.text();
        const backup = JSON.parse(text) as unknown;
        const outcome = isQuotaProbeApiLikelyAvailable()
          ? await importCockpitBackupJson(backup)
          : null;
        if (outcome) {
          applyCockpitOutcome(outcome);
          return;
        }
        pushToast("Import backup via CLI: pnpm quota:cockpit:import --backup=path", "info");
      } catch (err) {
        pushToast(err instanceof Error ? err.message : String(err), "error");
      } finally {
        setImporting(false);
      }
    },
    [applyCockpitOutcome, pushToast],
  );

  const directoryToolbar = useMemo(
    () => (
      <WorkspaceDirectorySearchToolbar
        screen="twofa"
        workspacePeriod={{ scope: "twofa", defaultRange: "all", inactiveKeys: ["all"] }}
        showTimeRange={false}
        showRefresh={false}
        showTablePageSize={false}
        countIcon={RefreshCw}
        shown={filtered.length}
        total={scoped.length}
        countLabel={vaultCopy.countLabel}
        showResultCount
      />
    ),
    [filtered.length, scoped.length, vaultCopy.countLabel],
  );

  useP0020DirectoryChrome({
    active: Boolean(shellMode && tabActive),
    toolbar: directoryToolbar,
    filterSelectionToolbar: {
      visibleCount: filtered.length,
      selectedCount: selectedIds.size,
      noun: "subscriptions",
    },
    filterToolbar: null,
    centerStats: [],
  });

  return (
    <div className="quota-screen">
      {!shellMode ? (
        <PageHeader
          title="Quota"
          desc="Live subscription usage for Claude, ChatGPT, Grok, and Gemini accounts in your vault."
        />
      ) : null}

      <div className="quota-screen__toolbar">
        <div className="quota-screen__filters" role="tablist" aria-label="Quota filters">
          {(
            [
              ["all", "All"],
              ["expiring", "Expiring ≤14d"],
              ["errors", "Probe issues"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              className={filter === key ? "quota-filter is-active" : "quota-filter"}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="quota-screen__actions">
          <button
            type="button"
            className="quota-refresh-btn"
            disabled={importing}
            onClick={() => void syncFromCockpit()}
          >
            {importing ? "Importing…" : "Sync Cockpit (Cursor + Gemini)"}
          </button>
          <button
            type="button"
            className="quota-refresh-btn"
            disabled={importing}
            onClick={() => backupInputRef.current?.click()}
          >
            <Upload size={14} />
            Backup JSON
          </button>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onBackupFile(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="quota-refresh-btn"
            disabled={probing || !filtered.length}
            onClick={() => void runProbe(filtered)}
          >
            <RefreshCw size={14} className={probing ? "quota-spin" : undefined} />
            Refresh all
          </button>
        </div>
      </div>

      <HubDirectoryBulkActionBar
        selectAll={{
          visibleCount: filtered.length,
          selectedCount: selectedIds.size,
          allVisibleSelected,
          onToggleSelectAll: toggleSelectAll,
          noun: "subscriptions",
        }}
      >
        {hasSelection ? (
          <button
            type="button"
            className="quota-refresh-btn"
            disabled={probing}
            onClick={() => void runProbe(selectedRows)}
          >
            {probing ? "Probing…" : `Refresh live (${selectedIds.size})`}
          </button>
        ) : null}
      </HubDirectoryBulkActionBar>

      <HubDirectoryTableShell
        items={filtered}
        ariaLabel={vaultCopy.cardGridAriaLabel}
        tableClassName={`${hubDirectoryTableClass("default")} hub-users-table--quota`}
        colgroup={colgroup}
        columns={COLUMNS.map((col) => ({
          ...col,
          sortable: false,
          colClass: `hub-users-col--quota-${col.key}`,
        }))}
        getRowKey={(row) => row.id}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        allVisibleSelected={allVisibleSelected}
        selectAllLabel="Select all quota accounts on this page"
        emptyMessage={
          scoped.length === 0
            ? vaultCopy.emptyVault
            : debouncedQuery.trim()
              ? vaultCopy.emptyFiltered
              : vaultCopy.emptyFiltered
        }
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        renderRowCells={(row) =>
          COLUMNS.map((col) => (
            <DirectoryTableBodyCell key={col.key} colClass={`hub-users-col--quota-${col.key}`}>
              {renderQuotaCell(col.key, row)}
            </DirectoryTableBodyCell>
          ))
        }
      />

      <p className="quota-screen__hint">
        Cockpit data: <code>%USERPROFILE%\.antigravity_cockpit</code> or export JSON from Cockpit Settings.
        Dev auto-starts quota API; production use <code>pnpm quota:cockpit:import</code> and{" "}
        <code>pnpm quota:probe:apply</code>.
      </p>
    </div>
  );
}
