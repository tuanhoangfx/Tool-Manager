import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { KeyRound, Plus, Shield } from "lucide-react";
import "./twofa-platform-icon.css";
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
import { useResolvedVisibleKpiKeys } from "../../components/sales-shell";
import {
  barChartSeriesSignature,
  chartKeysSignature,
  directoryChartBandNode,
  kpiTilesSignature,
  hubDirectoryListResetKey,
  HubDirectoryBulkActionBar,
  useHubDirectorySelection,
  directoryTableSortReducer,
  useDirectoryBandSync,
  useHubTablePageSize,
  useDebouncedValue,
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
import { filterTwofaAccounts, TWOFA_LARGE_VAULT_THRESHOLD } from "./twofa-filters";
import { twofaFiltersWithCounts } from "./twofa-filter-counts";
import { TwofaAccountCard } from "./TwofaAccountCard";
import { TwofaAccountsTable } from "./TwofaAccountsTable";
import { patchTwofaViewMode, readTwofaViewMode } from "./twofa-list-prefs";
import { TwofaTotpTickProvider } from "./twofa-totp-tick";
import { TwofaBulkActionBar } from "./TwofaBulkActionBar";
import { resolveTwofaDirectoryPageSize } from "./twofa-directory-page-size";
import { TwofaBulkMetaEditModal } from "./TwofaBulkMetaEditModal";
import { TwofaAddModal } from "./TwofaAddModal";
import { TwofaAccountDetailModal } from "./TwofaAccountDetailModal";
import { TwofaConfirmDialog } from "./TwofaConfirmDialog";
import { TwofaDedupePreviewModal } from "./TwofaDedupePreviewModal";
import type { TwofaDedupePreview, TwofaBulkMetaPatch } from "./twofa-upsert-accounts";
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
import { sortTwofaAccounts } from "./twofa-sort";
import { useNotesAuth } from "../notes/AuthSessionProvider";
import { filterTwofaVaultScope } from "./twofa-vault-scope";
import { twofaVaultScopeFromView, twofaVaultUiCopy } from "./twofa-vault-config";
import { useTwofaVaultView } from "./useTwofaVaultView";
import { TwofaQuotaBulkActionBar } from "./TwofaQuotaBulkActionBar";
import { QuotaEnrollModal } from "../quota/QuotaEnrollModal";
import { QuotaStealthTestModal } from "../quota/QuotaStealthTestModal";
import { useTwofaQuotaDirectoryActions } from "../quota/useTwofaQuotaDirectoryActions";
import type { CockpitImportOutcome } from "../quota/quota-api";
import { buildTwofaMailServiceUsageIndex } from "./twofa-mail-service-usage";

function visibleSet(set: Set<string> | null, defaults: Set<string>) {
  return set ?? defaults;
}

const TWOFA_CHART_ORDER = ["service_bar", "identity_bar", "usage_bar", "password_bar"] as const;

type AddModalState = { draft?: Partial<TwofaDraft> } | null;

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
    bulkUpdateMeta,
    dedupeNow,
    previewDedupe,
    applyQuotaResults,
    applyCockpitImport,
    syncFromCloud,
    fullSyncNotice,
    ackFullSyncNotice,
  } = useTwofaAccounts({ tabActive });
  const { pushToast } = useAppToast();
  const vaultView = useTwofaVaultView();
  const vaultScope = twofaVaultScopeFromView(vaultView);
  const vaultCopy = twofaVaultUiCopy(vaultScope);

  const scopedAccounts = useMemo(
    () => filterTwofaVaultScope(accounts, vaultScope),
    [accounts, vaultScope],
  );
  const mailServiceUsage = useMemo(
    () => (vaultScope === "mail" ? buildTwofaMailServiceUsageIndex(accounts) : null),
    [accounts, vaultScope],
  );

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
    setFilterValues,
    setDirectoryKpis,
    setDirectoryCharts,
    setSectionRuleLabel,
  } = useWorkspaceSearch();
  const query = shellMode ? wsQuery : queryProp;

  const [hubPrefs, setHubPrefs] = useState(readTwofaHubPrefs);
  const [period, setPeriod] = useState<WorkspacePeriodPrefs>(() => readWorkspacePeriod("twofa", "all"));
  const [addModal, setAddModal] = useState<AddModalState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TwofaAccount[] | null>(null);
  const [pendingReplace, setPendingReplace] = useState<PendingReplaceState>(null);
  const [bulkMetaOpen, setBulkMetaOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(() => readTwofaTableColumns());
  const [dedupeModalOpen, setDedupeModalOpen] = useState(false);
  const [dedupePreview, setDedupePreview] = useState<TwofaDedupePreview | null>(null);
  const [dedupePreviewLoading, setDedupePreviewLoading] = useState(false);
  const [dedupePreviewError, setDedupePreviewError] = useState<string | null>(null);
  const [dedupeRunning, setDedupeRunning] = useState(false);
  const [viewMode, setViewModeState] = useState<HubViewMode>(() => readTwofaViewMode());
  const userTablePageSize = useHubTablePageSize();

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

  const debouncedFilterQuery = useDebouncedValue(query, 150);
  const filterQuery =
    scopedAccounts.length > TWOFA_LARGE_VAULT_THRESHOLD ? debouncedFilterQuery : query;
  const twofaFilters = useMemo(
    () => twofaFiltersWithCounts(scopedAccounts, filterQuery, filterValues, period, vaultScope),
    [scopedAccounts, filterQuery, filterValues, period, vaultScope],
  );

  useEffect(() => {
    if (!filterValues.service?.length) return;
    const next = { ...filterValues };
    delete next.service;
    setFilterValues(next);
  }, [vaultScope]); // eslint-disable-line react-hooks/exhaustive-deps -- clear service facet when switching Mail/Services

  useEffect(() => {
    if (!shellMode) return;
    setFilters(twofaFilters);
    return () => setFilters([]);
  }, [setFilters, shellMode, twofaFilters]);

  // Live query for small vaults; 150ms debounce for large vaults (useDeferredValue never settled on ~6k rows).
  const displayedAccounts = useMemo(
    () => filterTwofaAccounts(scopedAccounts, filterQuery, filterValues, period),
    [scopedAccounts, filterQuery, filterValues, period],
  );

  const [{ sortKey, sortDir }, dispatchSort] = useReducer(
    directoryTableSortReducer<TwofaTableColumnKey>,
    { sortKey: "service" as TwofaTableColumnKey, sortDir: "asc" },
  );
  const onSort = useCallback((key: TwofaTableColumnKey) => {
    dispatchSort(key);
  }, []);

  const sortedDisplayedAccounts = useMemo(
    () => sortTwofaAccounts(displayedAccounts, sortKey, sortDir, mailServiceUsage ?? undefined),
    [displayedAccounts, sortKey, sortDir, mailServiceUsage],
  );

  const directoryPageSize = useMemo(
    () => resolveTwofaDirectoryPageSize(sortedDisplayedAccounts.length, userTablePageSize),
    [sortedDisplayedAccounts.length, userTablePageSize],
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

  const quotaActions = useTwofaQuotaDirectoryActions({
    applyQuotaResults,
    applyCockpitImport,
    syncFromCloud,
    selectedRows,
    visibleRows: sortedDisplayedAccounts,
  });

  const listResetKey = useMemo(
    () =>
      hubDirectoryListResetKey(
        filterQuery,
        filterValues,
        period,
        Array.from(visibleColumns).join(","),
        sortKey,
        sortDir,
        viewMode,
        vaultScope,
      ),
    [filterQuery, filterValues, period, visibleColumns, sortKey, sortDir, viewMode, vaultScope],
  );

  const handleQuotaEnrolled = useCallback(
    async (outcome: CockpitImportOutcome) => {
      const changed = applyCockpitImport(outcome.patches);
      if ((outcome.created ?? 0) > 0) {
        await syncFromCloud({ silent: true, full: true });
      }
      pushToast(
        `Enrolled ${outcome.accounts?.[0]?.email ?? "account"} — plan & quota synced`,
        changed > 0 || (outcome.created ?? 0) > 0 ? "success" : "info",
      );
    },
    [applyCockpitImport, pushToast, syncFromCloud],
  );

  const closeModal = useCallback(() => {
    setAddModal(null);
    setError(null);
  }, []);

  const openAddModal = useCallback((draft?: Partial<TwofaDraft>) => {
    setAddModal({
      draft: {
        ...(vaultCopy.addDefaultService ? { service: vaultCopy.addDefaultService } : {}),
        ...draft,
      },
    });
    setError(null);
  }, [vaultCopy.addDefaultService]);

  const openDetail = useCallback((row: TwofaAccount) => {
    setDetailId(row.id);
    setError(null);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
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
    if (target) openDetail(target);
  }, [openDetail, selectedRows]);

  const handleBulkMeta = useCallback(() => {
    if (selectedIds.size > 1) setBulkMetaOpen(true);
  }, [selectedIds.size]);

  const handleBulkMetaApply = useCallback(
    (patch: TwofaBulkMetaPatch) => {
      const count = bulkUpdateMeta([...selectedIds], patch);
      if (count > 0) {
        pushToast(`Updated ${count} account${count === 1 ? "" : "s"}.`, "success");
      }
      return count;
    },
    [bulkUpdateMeta, pushToast, selectedIds],
  );

  const handleSaveSingle = useCallback(
    (draft: TwofaDraft): "ok" | "conflict" | "fail" => {
      const result = add(draft);
      if (!result.ok) return "fail";
      pushToast(
        twofaSingleAddToast(result.replaced, draft.service, draft.account),
        result.replaced ? "info" : "success",
      );
      setError(null);
      return "ok";
    },
    [add, pushToast],
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
      closeDetail();
      setError(null);
    }
    setPendingReplace(null);
  }, [closeDetail, pendingReplace, pushToast, update]);

  const analyticsActive = shellMode && tabActive;
  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_TWOFA_HEADER_STAT_KEYS;
  const visKpi = useResolvedVisibleKpiKeys(hubPrefs.kpi, DEFAULT_TWOFA_KPI_KEYS, TWOFA_KPI_DEFS);
  const visCharts = visibleSet(hubPrefs.charts, DEFAULT_TWOFA_CHART_KEYS);
  const twofaKpis = useMemo(
    () => (analyticsActive ? buildTwofaKpis(scopedAccounts, displayedAccounts, visKpi) : []),
    [scopedAccounts, analyticsActive, displayedAccounts, visKpi],
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
      sectionRuleLabel: vaultCopy.sectionRuleLabel,
      kpiKey: kpiSig,
      chartsKey: chartsDepKey,
    },
    { setDirectoryKpis, setDirectoryCharts, setSectionRuleLabel },
    analyticsActive,
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [vaultScope, setSelectedIds]);

  useEffect(() => {
    if (detailId && !scopedAccounts.some((row) => row.id === detailId)) {
      setDetailId(null);
    }
  }, [scopedAccounts, detailId]);

  const detailAccount = useMemo(
    () => (detailId ? accounts.find((row) => row.id === detailId) ?? null : null),
    [accounts, detailId],
  );

  const handleDetailSave = useCallback(
    (draft: TwofaDraft): "ok" | "conflict" | "fail" => {
      if (!detailAccount) return "fail";
      const conflict = findTwofaDraftConflict(accounts, draft, detailAccount.id);
      if (conflict) {
        setPendingReplace({ editingId: detailAccount.id, draft, conflict });
        return "conflict";
      }
      const ok = update(detailAccount.id, draft);
      if (ok) {
        pushToast(twofaUpdateToast(draft.service, draft.account), "success");
        setError(null);
        return "ok";
      }
      return "fail";
    },
    [accounts, detailAccount, pushToast, update],
  );

  const modalInitialDraft = addModal
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
        total={scopedAccounts.length}
        countLabel={vaultCopy.countLabel}
        showResultCount={viewMode === "card"}
      />
    ),
    [
      displayedAccounts.length,
      scopedAccounts.length,
      setViewMode,
      vaultCopy.countLabel,
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
                noun: vaultScope === "quota" ? "subscriptions" : "accounts",
              }
            : null
        }
      >
        {vaultScope === "quota" ? (
          <TwofaQuotaBulkActionBar
            hasSelection={hasSelection}
            selectedCount={selectedIds.size}
            onAdd={() => openAddModal()}
            onEdit={handleBulkEdit}
            onBulkMeta={handleBulkMeta}
            onDelete={requestBulkDelete}
            onSyncCockpit={() => void quotaActions.syncFromCockpit()}
            onRefreshProbe={() => quotaActions.refreshProbe()}
            onStealthTest={() => quotaActions.setStealthOpen(true)}
            onImportBackup={quotaActions.onImportBackupClick}
            syncing={quotaActions.syncing}
            probing={quotaActions.probing}
          />
        ) : (
          <TwofaBulkActionBar
            hasSelection={hasSelection}
            selectedCount={selectedIds.size}
            onAdd={() => openAddModal()}
            onEdit={handleBulkEdit}
            onBulkMeta={handleBulkMeta}
            onDelete={requestBulkDelete}
            onDedupe={handleDedupePreview}
          />
        )}
      </HubDirectoryBulkActionBar>
    ),
    [
      allVisibleSelected,
      handleBulkEdit,
      handleBulkMeta,
      handleDedupePreview,
      hasSelection,
      openAddModal,
      quotaActions,
      requestBulkDelete,
      selectedIds.size,
      sortedDisplayedAccounts.length,
      toggleSelectAll,
      vaultScope,
      viewMode,
    ],
  );

  const directoryCenterStats = useMemo(
    () =>
      buildTwofaHeaderStats(visHeaderStats, {
        total: scopedAccounts.length,
        shown: displayedAccounts.length,
      }),
    [scopedAccounts.length, displayedAccounts.length, visHeaderStats],
  );

  useP0020DirectoryChrome({
    active: Boolean(shellMode && tabActive),
    toolbar: directoryToolbar,
    filterSelectionToolbar: {
      visibleCount: sortedDisplayedAccounts.length,
      selectedCount: selectedIds.size,
      noun: "accounts",
    },
    directoryViewMode: viewMode,
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
          pageSize={directoryPageSize}
          empty={
            !addModalOpen ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/[.02] px-6 py-10 text-center text-sm text-[var(--muted)]">
                <Shield className="mx-auto mb-2 text-amber-300/80" size={28} />
                {scopedAccounts.length === 0
                  ? vaultCopy.emptyVault
                  : vaultCopy.emptyFiltered}
              </div>
            ) : null
          }
          cardGridAriaLabel={vaultCopy.cardGridAriaLabel}
          renderCard={(row) => (
            <TwofaAccountCard
              key={row.id}
              account={row}
              selected={selectedIds.has(row.id)}
              editing={detailId === row.id}
              onToggleSelect={() => toggleSelect(row.id)}
              onOpen={() => openDetail(row)}
              onUsed={() => touchLastUsed(row.id)}
            />
          )}
          table={
            <TwofaAccountsTable
              rows={sortedDisplayedAccounts}
              visibleColumns={visibleColumns}
              detailId={detailId}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allVisibleSelected={allVisibleSelected}
              onUsed={touchLastUsed}
              onOpenAccount={openDetail}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
              resetKey={listResetKey}
              pageSize={directoryPageSize}
              mailView={vaultScope === "mail"}
              directoryContext={
                mailServiceUsage ? { mailServiceUsage } : undefined
              }
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
        open={addModalOpen && vaultScope !== "quota"}
        initialDraft={modalInitialDraft}
        onClose={closeModal}
        onSaveSingle={handleSaveSingle}
        onImportMany={handleImportMany}
      />

      <QuotaEnrollModal
        open={addModalOpen && vaultScope === "quota"}
        onClose={closeModal}
        onEnrolled={(outcome) => void handleQuotaEnrolled(outcome)}
      />

      {detailAccount ? (
        <TwofaAccountDetailModal
          key={detailAccount.id}
          account={detailAccount}
          onClose={closeDetail}
          onSave={handleDetailSave}
          onCodeUsed={() => touchLastUsed(detailAccount.id)}
        />
      ) : null}

      <TwofaBulkMetaEditModal
        open={bulkMetaOpen}
        selectedCount={selectedIds.size}
        onClose={() => setBulkMetaOpen(false)}
        onApply={handleBulkMetaApply}
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

      {vaultScope === "quota" ? (
        <>
          <input
            ref={quotaActions.backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void quotaActions.onBackupFile(file);
            }}
          />
          <QuotaStealthTestModal
            open={quotaActions.stealthOpen}
            onClose={() => quotaActions.setStealthOpen(false)}
            onOpened={() => {
              pushToast("Cursor opened in Stealth — login then Sync Cockpit", "info");
            }}
          />
        </>
      ) : null}
    </div>
  );
}
