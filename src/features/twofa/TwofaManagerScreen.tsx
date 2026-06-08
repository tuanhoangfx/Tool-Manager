import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, Shield } from "lucide-react";
import { MiniBarChart } from "../../components/sales-shell";
import { useAppToast } from "../../components/toast";
import { PageHeader } from "../design-preview/screens/PageHeader";
import { useTwofaAccounts } from "./useTwofaAccounts";
import type { TwofaAccount, TwofaDraft } from "./types";
import { useWorkspaceSearch } from "../workspace/WorkspaceSearchContext";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { readTwofaHubPrefs } from "./twofa-tab-prefs";
import { TwofaFilterToolbar } from "./TwofaFilterToolbar";
import { useResolvedVisibleKpiKeys } from "../../components/sales-shell";
import {
  barChartSeriesSignature,
  chartKeysSignature,
  kpiTilesSignature,
  useDirectoryBandSync,
} from "@tool-workspace/hub-ui";
import {
  DEFAULT_TWOFA_CHART_KEYS,
  DEFAULT_TWOFA_HEADER_STAT_KEYS,
  DEFAULT_TWOFA_KPI_KEYS,
  TWOFA_KPI_DEFS,
} from "./twofa-display-prefs";
import { buildTwofaChartItems, buildTwofaKpis } from "./twofa-aggregates";
import { buildTwofaHeaderStats } from "./twofa-header-metrics";
import { filterTwofaAccounts } from "./twofa-filters";
import { twofaFiltersWithCounts } from "./twofa-filter-counts";
import { parseTwofaSearchQuery } from "./parse-twofa-search";
import { TwofaAccountsTable } from "./TwofaAccountsTable";
import { TwofaBulkActionBar } from "./TwofaBulkActionBar";
import { TwofaAddModal } from "./TwofaAddModal";
import { TwofaConfirmDialog } from "./TwofaConfirmDialog";
import { findTwofaDraftConflict } from "./twofa-upsert-accounts";
import {
  formatTwofaEntryLabel,
  twofaDedupeToast,
  twofaImportToast,
  twofaSingleAddToast,
  twofaUpdateToast,
} from "./twofa-toast-messages";
import { readTwofaTableColumns } from "./twofa-table-prefs";
import { useNotesAuth } from "../notes/useNotesAuth";
import { NotesAuthGate } from "../notes/NotesAuthGate";

function visibleSet(set: Set<string> | null, defaults: Set<string>) {
  return set ?? defaults;
}

const TWOFA_CHART_ORDER = ["service_bar", "identity_bar", "usage_bar", "password_bar"] as const;

type AddModalState =
  | { mode: "add"; draft?: Partial<TwofaDraft> }
  | { mode: "edit"; account: TwofaAccount }
  | null;

type PendingReplaceState = {
  editingId: string;
  draft: TwofaDraft;
  conflict: TwofaAccount;
} | null;

export function TwofaManagerScreen({
  shellMode,
  query: queryProp = "",
}: {
  shellMode?: boolean;
  query?: string;
} = {}) {
  const { session, loading: authLoading } = useNotesAuth();

  if (shellMode) {
    if (!session && authLoading) {
      return (
        <div className="flex flex-1 items-center justify-center p-6 text-[12px] text-[var(--muted)]">
          Signing in…
        </div>
      );
    }
    if (!session) {
      return <NotesAuthGate variant="twofa" />;
    }
  }

  return (
    <TwofaManagerScreenBody shellMode={shellMode} query={queryProp} />
  );
}

function TwofaManagerScreenBody({
  shellMode,
  query: queryProp = "",
}: {
  shellMode?: boolean;
  query?: string;
} = {}) {
  const { accounts, tick, add, addMany, update, remove, touchLastUsed, dedupeNow } = useTwofaAccounts();
  const { pushToast } = useAppToast();
  const {
    query: wsQuery,
    setQuery: setWsQuery,
    filterValues,
    setFilters,
    setToolbar,
    setFilterToolbar,
    setCenterStats,
    setDirectoryKpis,
    setDirectoryCharts,
    setSectionRuleLabel,
  } = useWorkspaceSearch();
  const query = shellMode ? wsQuery : queryProp;

  const [hubPrefs, setHubPrefs] = useState(readTwofaHubPrefs);
  const [addModal, setAddModal] = useState<AddModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<TwofaAccount[] | null>(null);
  const [pendingReplace, setPendingReplace] = useState<PendingReplaceState>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(() => readTwofaTableColumns());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const sync = () => setVisibleColumns(readTwofaTableColumns());
    window.addEventListener("twofa-table-columns-change", sync);
    return () => window.removeEventListener("twofa-table-columns-change", sync);
  }, []);

  useEffect(() => subscribeHubListPrefs(() => setHubPrefs(readTwofaHubPrefs())), []);

  const twofaFilters = useMemo(
    () => twofaFiltersWithCounts(accounts, query, filterValues, hubPrefs.range),
    [accounts, filterValues, hubPrefs.range, query],
  );

  useEffect(() => {
    if (!shellMode) return;
    setFilters(twofaFilters);
    return () => setFilters([]);
  }, [setFilters, shellMode, twofaFilters]);

  const displayedAccounts = useMemo(
    () => filterTwofaAccounts(accounts, query, filterValues, hubPrefs.range),
    [accounts, filterValues, hubPrefs.range, query],
  );

  const tableRows = useMemo(
    () => displayedAccounts.slice(0, hubPrefs.limit),
    [displayedAccounts, hubPrefs.limit],
  );

  const tableTruncated = displayedAccounts.length > tableRows.length;

  const parsedSearch = useMemo(() => parseTwofaSearchQuery(query), [query]);
  const showInlineAdd = Boolean(query.trim()) && displayedAccounts.length === 0;

  const inlineDraft = useMemo(
    (): Partial<TwofaDraft> => ({
      service: parsedSearch.service,
      account: parsedSearch.account,
      secret: parsedSearch.secret || (parsedSearch.isSecretQuery ? query.trim() : ""),
    }),
    [parsedSearch, query],
  );

  const selectedRows = useMemo(
    () => displayedAccounts.filter((row) => selectedIds.has(row.id)),
    [displayedAccounts, selectedIds],
  );
  const allVisibleSelected =
    tableRows.length > 0 && tableRows.every((row) => selectedIds.has(row.id));
  const hasSelection = selectedIds.size > 0;

  const closeModal = useCallback(() => {
    setAddModal(null);
    setError(null);
  }, []);

  const openAddModal = useCallback((draft?: Partial<TwofaDraft>) => {
    setAddModal({ mode: "add", draft });
    setError(null);
  }, []);

  const startEdit = useCallback((row: TwofaAccount) => {
    setAddModal({ mode: "edit", account: row });
    setError(null);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (tableRows.every((row) => prev.has(row.id))) {
        const next = new Set(prev);
        tableRows.forEach((row) => next.delete(row.id));
        return next;
      }
      const next = new Set(prev);
      tableRows.forEach((row) => next.add(row.id));
      return next;
    });
  }, [tableRows]);

  const requestBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) return;
    setPendingDelete(selectedRows);
  }, [selectedRows]);

  const confirmBulkDelete = useCallback(() => {
    if (!pendingDelete?.length) return;
    for (const row of pendingDelete) remove(row.id);
    setSelectedIds(new Set());
    setPendingDelete(null);
    closeModal();
  }, [closeModal, pendingDelete, remove]);

  const handleBulkEdit = useCallback(() => {
    const target = selectedRows[0];
    if (target) startEdit(target);
  }, [selectedRows, startEdit]);

  const handleSaveSingle = useCallback(
    (draft: TwofaDraft): "ok" | "conflict" | "fail" => {
      if (addModal?.mode === "edit") {
        const conflict = findTwofaDraftConflict(accounts, draft, addModal.account.id);
        if (conflict) {
          setPendingReplace({ editingId: addModal.account.id, draft, conflict });
          return "conflict";
        }
        const ok = update(addModal.account.id, draft);
        if (ok) {
          pushToast(twofaUpdateToast(draft.service, draft.account), "success");
          setError(null);
          return "ok";
        }
        return "fail";
      }
      const result = add(draft);
      if (!result.ok) return "fail";
      pushToast(
        twofaSingleAddToast(result.replaced, draft.service, draft.account),
        result.replaced ? "info" : "success",
      );
      setError(null);
      return "ok";
    },
    [accounts, add, addModal, pushToast, update],
  );

  const handleImportMany = useCallback(
    (drafts: TwofaDraft[]) => {
      const result = addMany(drafts);
      if (result.total > 0) {
        pushToast(twofaImportToast(result), result.replaced > 0 ? "info" : "success");
      }
      return result;
    },
    [addMany, pushToast],
  );

  const handleDedupeNow = useCallback(() => {
    const removed = dedupeNow();
    pushToast(twofaDedupeToast(removed), removed > 0 ? "success" : "info");
  }, [dedupeNow, pushToast]);

  const confirmReplace = useCallback(() => {
    if (!pendingReplace) return;
    const ok = update(pendingReplace.editingId, pendingReplace.draft);
    if (ok) {
      pushToast(
        `Replaced ${formatTwofaEntryLabel(
          pendingReplace.conflict.service,
          pendingReplace.conflict.account,
        )}`,
        "success",
      );
      setAddModal(null);
      setError(null);
    }
    setPendingReplace(null);
  }, [pendingReplace, pushToast, update]);

  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_TWOFA_HEADER_STAT_KEYS;
  const visKpi = useResolvedVisibleKpiKeys(hubPrefs.kpi, DEFAULT_TWOFA_KPI_KEYS, TWOFA_KPI_DEFS);
  const visCharts = visibleSet(hubPrefs.charts, DEFAULT_TWOFA_CHART_KEYS);
  const twofaKpis = useMemo(
    () => (shellMode ? buildTwofaKpis(accounts, displayedAccounts, visKpi) : []),
    [accounts, displayedAccounts, shellMode, visKpi],
  );
  const twofaChartData = useMemo(() => buildTwofaChartItems(displayedAccounts), [displayedAccounts]);
  const chartsBand = useMemo(() => {
    if (!shellMode) return undefined;
    const hasCharts =
      visCharts.has("service_bar") ||
      visCharts.has("identity_bar") ||
      visCharts.has("usage_bar") ||
      visCharts.has("password_bar");
    if (!hasCharts) return undefined;
    return (
      <>
        {visCharts.has("service_bar") ? (
          <MiniBarChart title="Top Services" items={twofaChartData.serviceItems} />
        ) : null}
        {visCharts.has("identity_bar") ? (
          <MiniBarChart title="Account Identity" items={twofaChartData.identityItems} />
        ) : null}
        {visCharts.has("usage_bar") ? <MiniBarChart title="Usage" items={twofaChartData.usageItems} /> : null}
        {visCharts.has("password_bar") ? (
          <MiniBarChart title="Password Saved" items={twofaChartData.passwordItems} />
        ) : null}
      </>
    );
  }, [shellMode, twofaChartData, visCharts]);

  const kpiSig = useMemo(
    () => kpiTilesSignature(twofaKpis.length > 0 ? twofaKpis : undefined),
    [twofaKpis],
  );
  const chartsDepKey = useMemo(() => {
    if (!shellMode) return "";
    const visible = chartKeysSignature(visCharts, TWOFA_CHART_ORDER);
    if (!visible) return "";
    const parts: string[] = [];
    if (visCharts.has("service_bar")) parts.push(barChartSeriesSignature(twofaChartData.serviceItems));
    if (visCharts.has("identity_bar")) parts.push(barChartSeriesSignature(twofaChartData.identityItems));
    if (visCharts.has("usage_bar")) parts.push(barChartSeriesSignature(twofaChartData.usageItems));
    if (visCharts.has("password_bar")) parts.push(barChartSeriesSignature(twofaChartData.passwordItems));
    return `${visible}|${parts.join(";")}`;
  }, [shellMode, twofaChartData, visCharts]);

  useDirectoryBandSync(
    {
      kpis: twofaKpis.length > 0 ? twofaKpis : undefined,
      charts: chartsBand ?? null,
      sectionRuleLabel: "Accounts",
      kpiKey: kpiSig,
      chartsKey: chartsDepKey,
    },
    { setDirectoryKpis, setDirectoryCharts, setSectionRuleLabel },
    shellMode,
  );

  const editingId = addModal?.mode === "edit" ? addModal.account.id : null;

  const modalInitialDraft =
    addModal?.mode === "add"
      ? {
          service: addModal.draft?.service ?? (showInlineAdd ? inlineDraft.service ?? "" : ""),
          account: addModal.draft?.account ?? (showInlineAdd ? inlineDraft.account ?? "" : ""),
          password: addModal.draft?.password ?? (showInlineAdd ? inlineDraft.password ?? "" : ""),
          secret: addModal.draft?.secret ?? (showInlineAdd ? inlineDraft.secret ?? "" : ""),
        }
      : null;

  const addModalOpen = addModal !== null || showInlineAdd;
  const inlineSearchAdd = showInlineAdd && addModal === null;

  const deleteTitle =
    pendingDelete?.length === 1 ? "Delete account?" : `Delete ${pendingDelete?.length ?? 0} accounts?`;

  const replaceTitle = "Replace existing entry?";
  const replaceMessage = pendingReplace ? (
    <>
      <strong>{formatTwofaEntryLabel(pendingReplace.conflict.service, pendingReplace.conflict.account)}</strong>{" "}
      already exists. Saving will remove that entry and keep your edits.
    </>
  ) : null;

  const deleteMessage =
    pendingDelete && pendingDelete.length > 0 ? (
      <>
        Remove{" "}
        {pendingDelete.length === 1 ? (
          <strong>{pendingDelete[0].service}</strong>
        ) : (
          <>
            <strong>{pendingDelete.length} accounts</strong>
            {pendingDelete.length <= 4 ? (
              <>
                {" "}
                (
                {pendingDelete.map((r) => r.service).join(", ")})
              </>
            ) : null}
          </>
        )}{" "}
        from this device? This cannot be undone.
      </>
    ) : null;

  useEffect(() => {
    if (!shellMode) return;
    setToolbar(
      <TwofaFilterToolbar
        range={hubPrefs.range}
        limit={hubPrefs.limit}
        tableShown={tableRows.length}
        filteredTotal={displayedAccounts.length}
        total={accounts.length}
        onDedupe={handleDedupeNow}
      />,
    );
    setFilterToolbar(
      <TwofaBulkActionBar
        hasSelection={hasSelection}
        selectedCount={selectedIds.size}
        onAdd={() => openAddModal()}
        onEdit={handleBulkEdit}
        onDelete={requestBulkDelete}
      />,
    );
    setCenterStats(
      buildTwofaHeaderStats(visHeaderStats, {
        total: accounts.length,
        shown: tableRows.length,
      }),
    );
    return () => {
      setToolbar(null);
      setFilterToolbar(null);
      setCenterStats([]);
    };
  }, [
    accounts.length,
    displayedAccounts.length,
    handleBulkEdit,
    handleDedupeNow,
    hasSelection,
    hubPrefs.limit,
    hubPrefs.range,
    openAddModal,
    requestBulkDelete,
    selectedIds.size,
    shellMode,
    setCenterStats,
    setFilterToolbar,
    setToolbar,
    tableRows.length,
    visHeaderStats,
  ]);

  const accountsBody = (
    <>
      {error && !addModalOpen ? <p className="text-[12px] text-rose-300">{error}</p> : null}

      {!shellMode && !addModalOpen ? (
        <button
          type="button"
          className="btn inline-flex gap-2 text-[12px]"
          onClick={() => openAddModal()}
        >
          <Plus size={14} />
          Add account
        </button>
      ) : null}

      {displayedAccounts.length === 0 && !addModalOpen ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[.02] px-6 py-10 text-center text-sm text-[var(--muted)]">
          <Shield className="mx-auto mb-2 text-amber-300/80" size={28} />
          {accounts.length === 0
            ? "No 2FA entries yet. Search a service name or paste a Base32 secret to add one."
            : "No accounts match search or filters."}
        </div>
      ) : (
        <>
          <TwofaAccountsTable
            rows={tableRows}
            tick={tick}
            visibleColumns={visibleColumns}
            editingId={editingId}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            allVisibleSelected={allVisibleSelected}
            onUsed={touchLastUsed}
          />
          {tableTruncated ? (
            <p className="mt-2 text-center text-[11px] text-[var(--muted)]">
              Showing {tableRows.length} of {displayedAccounts.length} matching — increase row limit in toolbar
              (25–500).
            </p>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <div className="anim-fade">
      {!shellMode ? (
        <PageHeader
          title="2FA Manager"
          desc="Local TOTP — stored in this browser (localStorage). No sign-in required."
        />
      ) : null}

      {!shellMode ? (
        <p className="mb-3 text-[11px] text-[var(--muted)]">
          Local-first TOTP. Sign in (Tool Hub) to sync with the dedicated 2FA vault when configured.
        </p>
      ) : null}

      {shellMode ? accountsBody : <div className="space-y-3">{accountsBody}</div>}

      <TwofaAddModal
        open={addModalOpen}
        mode={addModal?.mode ?? "add"}
        initial={addModal?.mode === "edit" ? addModal.account : null}
        initialDraft={modalInitialDraft}
        searchQuery={inlineSearchAdd ? query : undefined}
        onClose={() => {
          closeModal();
          if (showInlineAdd && shellMode) setWsQuery("");
        }}
        onSaveSingle={handleSaveSingle}
        onImportMany={handleImportMany}
      />

      <TwofaConfirmDialog
        open={pendingDelete !== null}
        title={deleteTitle}
        message={deleteMessage}
        confirmLabel={
          pendingDelete?.length === 1 ? "Delete account" : `Delete ${pendingDelete?.length ?? 0}`
        }
        onConfirm={confirmBulkDelete}
        onClose={() => setPendingDelete(null)}
      />

      <TwofaConfirmDialog
        open={pendingReplace !== null}
        title={replaceTitle}
        message={replaceMessage}
        confirmLabel="Replace entry"
        danger={false}
        headerIcon={KeyRound}
        headerIconClassName="text-amber-300"
        onConfirm={confirmReplace}
        onClose={() => setPendingReplace(null)}
      />
    </div>
  );
}
