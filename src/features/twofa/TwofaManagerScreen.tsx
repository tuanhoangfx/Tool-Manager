import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, Shield } from "lucide-react";
import type { HubViewMode } from "../../components/sales-shell";
import { useAppToast } from "../../components/toast";
import { PageHeader } from "../../components/PageHeader";
import { useTwofaAccounts } from "./useTwofaAccounts";
import type { TwofaAccount, TwofaDraft } from "./types";
import { useWorkspaceSearch } from "../workspace/WorkspaceSearchContext";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { readWorkspacePeriod, type WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import { readTwofaHubPrefs } from "./twofa-tab-prefs";
import { P0020DirectoryScreen } from "../workspace/P0020DirectoryScreen";
import { useP0020DirectoryChrome } from "../workspace/useP0020DirectoryChrome";
import { TwofaCloudSyncTrailing } from "./TwofaCloudSyncTrailing";
import { useResolvedVisibleKpiKeys } from "../../components/sales-shell";
import {
  barChartSeriesSignature,
  chartKeysSignature,
  directoryChartBandNode,
  kpiTilesSignature,
  hubDirectoryListResetKey,
  HubDirectoryBulkActionBar,
  useHubDirectorySelection,
  useDirectoryBandSync,
  useDirectoryTableSort,
} from "@tool-workspace/hub-ui";
import { WorkspaceDirectorySearchToolbar } from "../workspace/WorkspaceDirectorySearchToolbar";
import {
  DEFAULT_TWOFA_CHART_KEYS,
  DEFAULT_TWOFA_HEADER_STAT_KEYS,
  DEFAULT_TWOFA_KPI_KEYS,
  TWOFA_CHART_DEFS,
  TWOFA_KPI_DEFS,
} from "./twofa-display-prefs";
import { buildTwofaChartItems, buildTwofaKpis } from "./twofa-aggregates";
import { buildTwofaHeaderStats } from "./twofa-header-metrics";
import { filterTwofaAccounts } from "./twofa-filters";
import { twofaFiltersWithCounts } from "./twofa-filter-counts";
import { TwofaAccountCard } from "./TwofaAccountCard";
import { TwofaAccountsTable } from "./TwofaAccountsTable";
import { patchTwofaViewMode, readTwofaViewMode } from "./twofa-list-prefs";
import { TwofaTotpTickProvider } from "./twofa-totp-tick";
import { TwofaBulkActionBar } from "./TwofaBulkActionBar";
import { TwofaAddModal } from "./TwofaAddModal";
import { TwofaConfirmDialog } from "./TwofaConfirmDialog";
import { TwofaDedupePreviewModal } from "./TwofaDedupePreviewModal";
import type { TwofaDedupePreview } from "./twofa-upsert-accounts";
import { findTwofaDraftConflict } from "./twofa-upsert-accounts";
import {
  formatTwofaEntryLabel,
  twofaDedupeToast,
  twofaFullResyncToast,
  twofaImportToast,
  twofaSingleAddToast,
  twofaUpdateToast,
} from "./twofa-toast-messages";
import { readTwofaTableColumns, type TwofaTableColumnKey } from "./twofa-table-prefs";
import { sortableTwofaValue } from "./twofa-sort";
import { useNotesAuth } from "../notes/AuthSessionProvider";

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
  tabActive = true,
}: {
  shellMode?: boolean;
  query?: string;
  tabActive?: boolean;
} = {}) {
  const { session, loading: authLoading, offline } = useNotesAuth();

  if (shellMode && !authLoading && (!session || offline)) {
    return null;
  }

  return (
    <TwofaManagerScreenBody shellMode={shellMode} query={queryProp} tabActive={tabActive} />
  );
}

function TwofaManagerScreenBody({
  shellMode,
  query: queryProp = "",
  tabActive = true,
}: {
  shellMode?: boolean;
  query?: string;
  tabActive?: boolean;
} = {}) {
  const {
    accounts,
    add,
    addMany,
    update,
    remove,
    touchLastUsed,
    dedupeNow,
    previewDedupe,
    cloudState,
    cloudError,
    fullSyncNotice,
    ackFullSyncNotice,
    syncFromCloud,
  } = useTwofaAccounts({ tabActive });
  const { pushToast } = useAppToast();

  useEffect(() => {
    if (!fullSyncNotice) return;
    pushToast(
      twofaFullResyncToast(fullSyncNotice.count),
      fullSyncNotice.count > 0 ? "success" : "info",
    );
    ackFullSyncNotice();
  }, [ackFullSyncNotice, fullSyncNotice, pushToast]);
  const {
    query: wsQuery,
    filterValues,
    setFilters,
    setDirectoryKpis,
    setDirectoryCharts,
    setSectionRuleLabel,
  } = useWorkspaceSearch();
  const query = shellMode ? wsQuery : queryProp;

  const [hubPrefs, setHubPrefs] = useState(readTwofaHubPrefs);
  const [period, setPeriod] = useState<WorkspacePeriodPrefs>(() => readWorkspacePeriod("twofa", "all"));
  const [addModal, setAddModal] = useState<AddModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<TwofaAccount[] | null>(null);
  const [pendingReplace, setPendingReplace] = useState<PendingReplaceState>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(() => readTwofaTableColumns());
  const [dedupeModalOpen, setDedupeModalOpen] = useState(false);
  const [dedupePreview, setDedupePreview] = useState<TwofaDedupePreview | null>(null);
  const [dedupePreviewLoading, setDedupePreviewLoading] = useState(false);
  const [dedupePreviewError, setDedupePreviewError] = useState<string | null>(null);
  const [dedupeRunning, setDedupeRunning] = useState(false);
  const [viewMode, setViewModeState] = useState<HubViewMode>(() => readTwofaViewMode());

  const setViewMode = useCallback((mode: HubViewMode) => {
    setViewModeState(mode);
    patchTwofaViewMode(mode);
  }, []);

  useEffect(() => {
    const sync = () => setVisibleColumns(readTwofaTableColumns());
    window.addEventListener("twofa-table-columns-change", sync);
    return () => window.removeEventListener("twofa-table-columns-change", sync);
  }, []);

  useEffect(() => subscribeHubListPrefs(() => {
    setHubPrefs(readTwofaHubPrefs());
    setPeriod(readWorkspacePeriod("twofa", "all"));
    setViewModeState(readTwofaViewMode());
  }), []);

  const accountsForAnalytics = useDeferredValue(accounts);
  const twofaFilters = useMemo(
    () => twofaFiltersWithCounts(accountsForAnalytics, query, filterValues, period),
    [accountsForAnalytics, filterValues, period, query],
  );

  useEffect(() => {
    if (!shellMode) return;
    setFilters(twofaFilters);
    return () => setFilters([]);
  }, [setFilters, shellMode, twofaFilters]);

  const displayedAccounts = useMemo(
    () => filterTwofaAccounts(accounts, query, filterValues, period),
    [accounts, filterValues, period, query],
  );

  const { sortKey, sortDir, onSort, sorted: sortedDisplayedAccounts } = useDirectoryTableSort(
    displayedAccounts,
    "service" as TwofaTableColumnKey,
    sortableTwofaValue,
  );

  const {
    selectedIds,
    setSelectedIds,
    selectedRows,
    allVisibleSelected,
    hasSelection,
    toggleSelect,
    toggleSelectAll,
  } = useHubDirectorySelection(sortedDisplayedAccounts, (row) => row.id);
  const listResetKey = useMemo(
    () =>
      hubDirectoryListResetKey(query, filterValues, period, Array.from(visibleColumns).join(","), sortKey, sortDir, viewMode),
    [query, filterValues, period, visibleColumns, sortKey, sortDir, viewMode],
  );

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

  const handleDedupePreview = useCallback(() => {
    setDedupeModalOpen(true);
    setDedupePreviewLoading(true);
    setDedupePreviewError(null);
    setDedupePreview(null);
    void previewDedupe().then(({ preview, error }) => {
      setDedupePreviewLoading(false);
      if (error) {
        setDedupePreviewError(error);
        return;
      }
      setDedupePreview(preview);
    });
  }, [previewDedupe]);

  const handleDedupeConfirm = useCallback(() => {
    setDedupeRunning(true);
    void dedupeNow()
      .then((removed) => {
        pushToast(twofaDedupeToast(removed), removed > 0 ? "success" : "info");
        setDedupeModalOpen(false);
        setDedupePreview(null);
      })
      .finally(() => setDedupeRunning(false));
  }, [dedupeNow, pushToast]);

  const closeDedupeModal = useCallback(() => {
    if (dedupeRunning) return;
    setDedupeModalOpen(false);
    setDedupePreview(null);
    setDedupePreviewError(null);
  }, [dedupeRunning]);

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

  const analyticsActive = shellMode && tabActive;
  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_TWOFA_HEADER_STAT_KEYS;
  const visKpi = useResolvedVisibleKpiKeys(hubPrefs.kpi, DEFAULT_TWOFA_KPI_KEYS, TWOFA_KPI_DEFS);
  const visCharts = visibleSet(hubPrefs.charts, DEFAULT_TWOFA_CHART_KEYS);
  const twofaKpis = useMemo(
    () => (analyticsActive ? buildTwofaKpis(accounts, displayedAccounts, visKpi) : []),
    [accounts, analyticsActive, displayedAccounts, visKpi],
  );
  const twofaChartData = useMemo(
    () => (analyticsActive ? buildTwofaChartItems(displayedAccounts) : null),
    [analyticsActive, displayedAccounts],
  );
  const chartsBand = useMemo(
    () =>
      analyticsActive && twofaChartData
        ? directoryChartBandNode({
            visCharts,
            defs: TWOFA_CHART_DEFS,
            data: {
              service_bar: twofaChartData.serviceItems,
              identity_bar: twofaChartData.identityItems,
              usage_bar: twofaChartData.usageItems,
              password_bar: twofaChartData.passwordItems,
            },
          })
        : undefined,
    [analyticsActive, twofaChartData, visCharts],
  );

  const kpiSig = useMemo(
    () => kpiTilesSignature(twofaKpis.length > 0 ? twofaKpis : undefined),
    [twofaKpis],
  );
  const chartsDepKey = useMemo(() => {
    if (!analyticsActive || !twofaChartData) return "";
    const visible = chartKeysSignature(visCharts, TWOFA_CHART_ORDER);
    if (!visible) return "";
    const parts: string[] = [];
    if (visCharts.has("service_bar")) parts.push(barChartSeriesSignature(twofaChartData.serviceItems));
    if (visCharts.has("identity_bar")) parts.push(barChartSeriesSignature(twofaChartData.identityItems));
    if (visCharts.has("usage_bar")) parts.push(barChartSeriesSignature(twofaChartData.usageItems));
    if (visCharts.has("password_bar")) parts.push(barChartSeriesSignature(twofaChartData.passwordItems));
    return `${visible}|${parts.join(";")}`;
  }, [analyticsActive, twofaChartData, visCharts]);

  useDirectoryBandSync(
    {
      kpis: twofaKpis.length > 0 ? twofaKpis : undefined,
      charts: chartsBand ?? null,
      sectionRuleLabel: "Accounts",
      kpiKey: kpiSig,
      chartsKey: chartsDepKey,
    },
    { setDirectoryKpis, setDirectoryCharts, setSectionRuleLabel },
    analyticsActive,
  );

  const editingId = addModal?.mode === "edit" ? addModal.account.id : null;

  const modalInitialDraft =
    addModal?.mode === "add"
      ? {
          service: addModal.draft?.service ?? "",
          account: addModal.draft?.account ?? "",
          password: addModal.draft?.password ?? "",
          secret: addModal.draft?.secret ?? "",
        }
      : null;

  const addModalOpen = addModal !== null;

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

  const directoryToolbar = useMemo(
    () => (
      <WorkspaceDirectorySearchToolbar
        screen="twofa"
        workspacePeriod={{ scope: "twofa", defaultRange: "all", inactiveKeys: ["all"] }}
        showTimeRange={false}
        showRefresh={false}
        showTablePageSize
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        countIcon={Shield}
        shown={displayedAccounts.length}
        total={accounts.length}
        countLabel="accounts"
        showResultCount={viewMode === "card"}
        trailing={
          <TwofaCloudSyncTrailing
            filteredTotal={displayedAccounts.length}
            total={accounts.length}
            cloudState={cloudState}
            cloudError={cloudError}
            onCloudSync={() => void syncFromCloud({ full: true })}
          />
        }
      />
    ),
    [
      accounts.length,
      cloudError,
      cloudState,
      displayedAccounts.length,
      setViewMode,
      syncFromCloud,
      viewMode,
    ],
  );

  const directoryFilterToolbar = useMemo(
    () => (
      <HubDirectoryBulkActionBar
        selectAll={
          viewMode === "card"
            ? {
                visibleCount: sortedDisplayedAccounts.length,
                selectedCount: selectedIds.size,
                allVisibleSelected,
                onToggleSelectAll: toggleSelectAll,
                noun: "accounts",
              }
            : null
        }
      >
        <TwofaBulkActionBar
          hasSelection={hasSelection}
          selectedCount={selectedIds.size}
          onAdd={() => openAddModal()}
          onEdit={handleBulkEdit}
          onDelete={requestBulkDelete}
          onDedupe={handleDedupePreview}
        />
      </HubDirectoryBulkActionBar>
    ),
    [
      allVisibleSelected,
      handleBulkEdit,
      handleDedupePreview,
      hasSelection,
      openAddModal,
      requestBulkDelete,
      selectedIds.size,
      sortedDisplayedAccounts.length,
      toggleSelectAll,
      viewMode,
    ],
  );

  const directoryCenterStats = useMemo(
    () =>
      buildTwofaHeaderStats(visHeaderStats, {
        total: accounts.length,
        shown: displayedAccounts.length,
      }),
    [accounts.length, displayedAccounts.length, visHeaderStats],
  );

  useP0020DirectoryChrome({
    active: Boolean(shellMode && tabActive),
    toolbar: directoryToolbar,
    filterSelectionToolbar:
      viewMode !== "card"
        ? {
            visibleCount: sortedDisplayedAccounts.length,
            selectedCount: selectedIds.size,
            noun: "accounts",
          }
        : undefined,
    filterToolbar: directoryFilterToolbar,
    centerStats: directoryCenterStats,
  });

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

      <TwofaTotpTickProvider active={tabActive}>
        <P0020DirectoryScreen
          items={sortedDisplayedAccounts}
          viewMode={viewMode}
          resetKey={listResetKey}
          empty={
            !addModalOpen ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[.02] px-6 py-10 text-center text-sm text-[var(--muted)]">
                <Shield className="mx-auto mb-2 text-amber-300/80" size={28} />
                {accounts.length === 0
                  ? "No 2FA entries yet. Use Add to create one."
                  : "No accounts match search or filters."}
              </div>
            ) : null
          }
          cardGridAriaLabel="2FA account card pages"
          renderCard={(row) => (
            <TwofaAccountCard
              key={row.id}
              account={row}
              selected={selectedIds.has(row.id)}
              editing={editingId === row.id}
              onToggleSelect={() => toggleSelect(row.id)}
              onOpen={() => startEdit(row)}
              onUsed={() => touchLastUsed(row.id)}
            />
          )}
          table={
            <TwofaAccountsTable
              rows={sortedDisplayedAccounts}
              visibleColumns={visibleColumns}
              editingId={editingId}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allVisibleSelected={allVisibleSelected}
              onUsed={touchLastUsed}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              resetKey={listResetKey}
            />
          }
        />
      </TwofaTotpTickProvider>
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
        onClose={closeModal}
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

      <TwofaDedupePreviewModal
        open={dedupeModalOpen}
        loading={dedupePreviewLoading}
        running={dedupeRunning}
        preview={dedupePreview}
        error={dedupePreviewError}
        onConfirm={handleDedupeConfirm}
        onClose={closeDedupeModal}
      />
    </div>
  );
}
