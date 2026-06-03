import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, Shield } from "lucide-react";
import { PageHeader } from "../design-preview/screens/PageHeader";
import { useTwofaAccounts } from "./useTwofaAccounts";
import type { TwofaAccount, TwofaDraft } from "./types";
import { useWorkspaceSearch } from "../workspace/WorkspaceSearchContext";
import { readHubListPrefs } from "../../lib/url-prefs";
import { TwofaFilterToolbar } from "./TwofaFilterToolbar";
import { DEFAULT_TWOFA_HEADER_STAT_KEYS } from "./twofa-display-prefs";
import {
  buildTwofaServiceFilterOptions,
  filterTwofaAccounts,
  TWOFA_FILTER_DEFS,
} from "./twofa-filters";
import { parseTwofaSearchQuery } from "./parse-twofa-search";
import { TwofaAccountsTable } from "./TwofaAccountsTable";
import { TwofaBulkActionBar } from "./TwofaBulkActionBar";
import { TwofaAddForm } from "./TwofaAddForm";
import { TwofaAddModal } from "./TwofaAddModal";
import { TwofaConfirmDialog } from "./TwofaConfirmDialog";
import { readTwofaTableColumns } from "./twofa-table-prefs";
import { useNotesAuth } from "../notes/useNotesAuth";
import { NotesAuthGate } from "../notes/NotesAuthGate";

type AddModalState =
  | { mode: "add"; draft?: Partial<TwofaDraft> }
  | { mode: "edit"; account: TwofaAccount }
  | null;

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
  const { accounts, tick, add, addMany, update, remove, touchLastUsed, cloudState, cloudError } =
    useTwofaAccounts();
  const {
    query: wsQuery,
    setQuery: setWsQuery,
    filterValues,
    setFilters,
    setToolbar,
    setFilterToolbar,
    setCenterStats,
  } = useWorkspaceSearch();
  const query = shellMode ? wsQuery : queryProp;

  const [hubPrefs, setHubPrefs] = useState(readHubListPrefs);
  const [addModal, setAddModal] = useState<AddModalState>(null);
  const [pendingDelete, setPendingDelete] = useState<TwofaAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState(() => readTwofaTableColumns());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const sync = () => setVisibleColumns(readTwofaTableColumns());
    window.addEventListener("twofa-table-columns-change", sync);
    return () => window.removeEventListener("twofa-table-columns-change", sync);
  }, []);

  useEffect(() => {
    const sync = () => setHubPrefs(readHubListPrefs());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const serviceOptions = useMemo(() => buildTwofaServiceFilterOptions(accounts), [accounts]);

  useEffect(() => {
    if (!shellMode) return;
    setFilters(
      TWOFA_FILTER_DEFS.map((def) =>
        def.key === "service" ? { ...def, options: serviceOptions } : def,
      ),
    );
    return () => setFilters([]);
  }, [serviceOptions, setFilters, shellMode]);

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
    (draft: TwofaDraft) => {
      if (addModal?.mode === "edit") {
        return update(addModal.account.id, draft);
      }
      const ok = add(draft);
      if (ok) setError(null);
      return ok;
    },
    [add, addModal, update],
  );

  const handleImportMany = useCallback(
    (drafts: TwofaDraft[]) => {
      const { added } = addMany(drafts);
      return added;
    },
    [addMany],
  );

  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_TWOFA_HEADER_STAT_KEYS;
  const editingId = addModal?.mode === "edit" ? addModal.account.id : null;

  const modalInitialDraft =
    addModal?.mode === "add" && addModal.draft
      ? {
          service: addModal.draft.service ?? "",
          account: addModal.draft.account ?? "",
          password: addModal.draft.password ?? "",
          secret: addModal.draft.secret ?? "",
        }
      : null;

  const deleteTitle =
    pendingDelete?.length === 1 ? "Delete account?" : `Delete ${pendingDelete?.length ?? 0} accounts?`;

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
      [
        visHeaderStats.has("twofa-total")
          ? {
              key: "twofa-total",
              icon: Shield,
              label: "accounts",
              value: accounts.length,
              toneClass: "text-amber-300",
            }
          : null,
        visHeaderStats.has("twofa-in-range")
          ? {
              key: "twofa-in-range",
              icon: KeyRound,
              label: "shown",
              value: tableRows.length,
              toneClass: "text-cyan-300",
            }
          : null,
      ].filter((stat): stat is NonNullable<typeof stat> => stat !== null),
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

      {shellMode && cloudState !== "off" ? (
        <p className="mb-2 text-[11px] text-[var(--muted)]">
          Cloud vault:{" "}
          {cloudState === "syncing"
            ? "Syncing…"
            : cloudState === "error"
              ? `Error — ${cloudError ?? "sync failed"}`
              : cloudState === "ok"
                ? "Synced (delta)"
                : "Sign in to enable sync"}
        </p>
      ) : null}

      {error && !addModal ? (
        <p className="mb-3 text-[12px] text-rose-300">{error}</p>
      ) : null}

      {!shellMode && !showInlineAdd ? (
        <button
          type="button"
          className="btn mb-3 inline-flex gap-2 text-[12px]"
          onClick={() => openAddModal()}
        >
          <Plus size={14} />
          Add account
        </button>
      ) : null}

      {showInlineAdd ? (
        <TwofaAddForm
          active
          variant="embedded"
          mode="add"
          initialDraft={inlineDraft}
          searchQuery={query}
          onClose={() => {
            if (shellMode) setWsQuery("");
          }}
          onSaveSingle={handleSaveSingle}
          onImportMany={handleImportMany}
        />
      ) : displayedAccounts.length === 0 ? (
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

      <TwofaAddModal
        open={addModal !== null && !showInlineAdd}
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
    </div>
  );
}
