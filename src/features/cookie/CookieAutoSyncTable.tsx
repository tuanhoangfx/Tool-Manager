import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import {
  CookieRouteFormModal,
  CookieRouteModalActions,
  CookieRouteModalSection,
} from "./CookieRouteFormModal";
import {
  directoryChartBandNode,
  HubModalFilterField,
  HubFormFieldLabel,
  hubDirectoryListResetKey,
  HUB_TOOL_DETAIL_FORM_GRID_3_CLASS,
  barChartSeriesSignature,
  chartKeysSignature,
  kpiTilesSignature,
  useDirectoryBandSync,
  useResolvedVisibleChartKeys,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import { WorkspaceDirectorySearchToolbar } from "../workspace/WorkspaceDirectorySearchToolbar";
import {
  COOKIE_ROUTE_ADD_TOC,
  COOKIE_ROUTE_EDIT_TOC,
  COOKIE_ROUTE_SHARE_TOC,
  cookieRouteSectionTitle,
} from "./cookie-route-form-toc";
import { CookieRouteDetailModal } from "./CookieRouteDetailModal";
import {
  Boxes,
  Check,
  Cookie,
  FileText,
  LayoutGrid,
  Globe2,
  Link2,
  LockKeyhole,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Share2,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  MetricBadge,
  type HubViewMode,
  type KpiTileData,
  type MetricBadgeTone,
  useResolvedVisibleKpiKeys,
} from "../../components/sales-shell";
import { useAppToast } from "../../components/toast";
import { useNotesAuth } from "../notes/AuthSessionProvider";
import { useWorkspaceSearch } from "../workspace/WorkspaceSearchContext";
import type { NoteListItem } from "../notes/types";
import { routeMatchesTimeRange } from "./cookie-route-activity";
import { cookieLines } from "../notes/noteUtils";
import { DOMAIN_PRESETS, normalizeCookieDomain, type CookieBinding } from "./cookieBridge";
import { readCookieDeepLink } from "./cookieDeepLink";
import { buildAppUrl } from "../../lib/workspace-path";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { readWorkspacePeriod, type WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import { readCookieHubPrefs } from "./cookie-tab-prefs";
import {
  DEFAULT_COOKIE_LIST_SORT,
  patchCookieListPrefs,
  patchCookieViewMode,
  readCookieListPrefs,
  readCookieViewMode,
  type CookieListSort,
} from "./cookie-list-prefs";
import { sortCookieAutoRows } from "./cookie-route-sort";
import { buildCookieChartItems } from "./cookie-aggregates";
import { cookieRouteFiltersWithCounts, filterCookieRows } from "./cookie-route-filter-counts";
import {
  DEFAULT_COOKIE_CHART_KEYS,
  DEFAULT_COOKIE_HEADER_STAT_KEYS,
  DEFAULT_COOKIE_KPI_KEYS,
  COOKIE_CHART_DEFS,
  COOKIE_KPI_DEFS,
} from "./cookie-display-prefs";
import { buildCookieHeaderStats } from "./cookie-header-metrics";
import { CookieRouteCard } from "./CookieRouteCard";
import { P0020DirectoryScreen } from "../workspace/P0020DirectoryScreen";
import { sanitizeCookieFilterUrl, stripLegacyCookieFilterValues } from "./cookie-filter-icons";
import { CookieRoutesDirectoryTable } from "./CookieRoutesDirectoryTable";
import type { CookieAutoRow } from "./cookieAutoRow";
import { CookieDirectorySkeleton } from "./CookieDirectorySkeleton";

const COOKIE_CHART_ORDER = ["status_bar", "platform_bar", "share_bar"] as const;
import { COOKIE_ACCESS_SELECT_OPTIONS } from "./cookieAccessSelectOptions";
import { getCookieRoutePublishStatus } from "./cookieRoutesRepository";
import { upsertNoteCookieMember } from "./noteCookieMembersRepository";
import {
  fetchNoteCookieMembers,
  getCachedNoteCookieMembers,
  getResolvedNoteCookieMembers,
  prefetchNoteCookieMembers,
  prefetchNoteCookieMembersBatch,
  subscribeNoteCookieMembersCache,
} from "./cookieRouteMembersPrefetch";
import { listNoteCookieMemberCounts } from "./noteCookieMembersRepository";
import { formatGranteeSharePreview } from "./grantee-display";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { lookupVaultRow } from "./useCookieVaultMap";

export type { CookieAutoRow } from "./cookieAutoRow";
export { CookieRouteDetailModal } from "./CookieRouteDetailModal";

function buildRows(bindings: CookieBinding[], notesById: Map<string, NoteListItem>): CookieAutoRow[] {
  return bindings
    .filter((b) => b.enabled)
    .map((binding) => {
      const note = notesById.get(binding.noteId);
      const lines = note ? cookieLines(note.cookie_snapshot) : [];
      return { binding, note, lines };
    });
}

type Props = {
  bindings: CookieBinding[];
  notes: NoteListItem[];
  loading?: boolean;
  selectedBindingId?: string | null;
  onSelect?: (bindingId: string) => void;
  onAdd?: (noteId: string, domain: string, pass: string) => void;
  onUpdate?: (id: string, patch: Partial<CookieBinding>) => void;
  onRemove?: (id: string) => void;
  onRefresh?: () => void;
  onEnsureRoutePublished?: (binding: CookieBinding) => Promise<boolean>;
  vaultByKey?: Record<string, CookieVaultRow>;
  toolbarActions?: ReactNode;
  toolbarActionsKey?: string;
  renderDetail?: (binding: CookieBinding) => ReactNode;
  renderAccessDetail?: (
    binding: CookieBinding,
    ctx?: { vault?: CookieVaultRow; noteSyncedAt?: string | null },
  ) => ReactNode;
};

type RouteModalState =
  | { type: "add" }
  | { type: "edit"; id: string }
  | { type: "delete"; ids: string[] }
  | { type: "detail"; id: string }
  | { type: "share"; id: string }
  | null;

type ShareRole = "load" | "sync";

function statusTone(status: string | undefined): MetricBadgeTone {
  if (!status || status === "pending") return "warn";
  if (/fail|error/i.test(status)) return "bad";
  return "ok";
}

function RouteDetailSectionHead({
  icon: Icon,
  title,
  desc,
  tone,
}: {
  icon: ElementType;
  title: string;
  desc?: string;
  tone: "indigo" | "amber" | "emerald" | "cyan" | "rose";
}) {
  return (
    <div className="rdp-section-head rdp-section-head--with-icon">
      <span className={`rdp-section-icon rdp-${tone}`}>
        <Icon size={14} />
      </span>
      <div className="min-w-0">
        <h4>{title}</h4>
        {desc ? <p className="rdp-section-desc">{desc}</p> : null}
      </div>
    </div>
  );
}

function sharePermissions(role: ShareRole) {
  return {
    canApply: true,
    canPublish: role === "sync",
    canManage: false,
  };
}

function DetailNav({
  items,
  activeId,
  onActiveChange,
}: {
  items: Array<{
    id: string;
    label: string;
    icon: ElementType<{ size?: number; className?: string }>;
    dotClass: string;
    iconClass: string;
  }>;
  activeId: string;
  onActiveChange: (id: string) => void;
}) {
  return (
    <nav
      className="rounded-xl border border-white/5 bg-[var(--panel)] p-2 text-[12px] shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
      aria-label="Route detail sections"
    >
      <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-300">
        Route detail
      </div>
      {items.map((item) => {
        const active = activeId === item.id;
        const Icon = item.icon;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active ? "true" : undefined}
            onClick={() => onActiveChange(item.id)}
            className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${
              active
                ? "bg-indigo-500/10 text-indigo-100 ring-1 ring-indigo-400/20"
                : "text-[var(--muted)] hover:bg-white/[.04] hover:text-[var(--text)]"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                active ? `${item.dotClass} shadow-[0_0_10px_rgba(129,140,248,0.75)]` : "bg-white/20 group-hover:bg-indigo-300/60"
              }`}
              aria-hidden
            />
            <Icon size={12} className={`shrink-0 ${active ? item.iconClass : "text-[var(--muted)] group-hover:text-indigo-200"}`} />
            <span className="truncate">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

function DetailSection({
  id,
  title,
  eyebrow,
  children,
  onMouseEnter,
  frame = true,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onMouseEnter?: () => void;
  frame?: boolean;
}) {
  if (!frame) {
    return (
      <section id={id} className="scroll-mt-3 space-y-3" onMouseEnter={onMouseEnter}>
        {children}
      </section>
    );
  }

  return (
    <section id={id} className="scroll-mt-3 rounded-2xl border border-white/5 bg-white/[.018] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)]" onMouseEnter={onMouseEnter}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-white/5 pb-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {eyebrow ? <p className="mt-1 text-[11px] text-[var(--muted)]">{eyebrow}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function HealthRow({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/5 bg-white/[.02] px-2.5 py-1.5 text-[12px]">
      <span className="font-mono text-[var(--muted)]">{label}</span>
      <MetricBadge label={value} tone={good ? "ok" : "warn"} />
    </div>
  );
}

export function CookieAutoSyncTable({
  bindings,
  notes,
  loading,
  selectedBindingId,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onRefresh,
  onEnsureRoutePublished,
  vaultByKey = {},
  toolbarActions,
  toolbarActionsKey = "",
  renderDetail,
  renderAccessDetail,
}: Props) {
  const { pushToast } = useAppToast();
  const { session } = useNotesAuth();
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const noteSelectOptions = useMemo(
    () =>
      notes.map((n) => ({
        value: n.id,
        label: n.title?.trim() || "Untitled",
      })),
    [notes],
  );
  const rows = useMemo(() => buildRows(bindings, notesById), [bindings, notesById]);
  const {
    query: routeQuery,
    filterValues,
    setFilters,
    setFilterValues,
    setToolbar,
    setFilterToolbar,
    setDirectoryKpis,
    setDirectoryCharts,
    setSectionRuleLabel,
    setCenterStats,
  } = useWorkspaceSearch();
  const [prefs, setPrefs] = useState(readCookieHubPrefs);
  const [period, setPeriod] = useState<WorkspacePeriodPrefs>(() => readWorkspacePeriod("cookie", "all"));
  const [listPrefs, setListPrefs] = useState(readCookieListPrefs);
  const visKpi = useResolvedVisibleKpiKeys(prefs.kpi, DEFAULT_COOKIE_KPI_KEYS, COOKIE_KPI_DEFS);
  const visCharts = useResolvedVisibleChartKeys(prefs.charts, DEFAULT_COOKIE_CHART_KEYS, COOKIE_CHART_DEFS);
  const visHeaderStats = prefs.headerStats ?? DEFAULT_COOKIE_HEADER_STAT_KEYS;
  const [modal, setModal] = useState<RouteModalState>(null);
  const [draftNoteId, setDraftNoteId] = useState("");
  const [draftDomain, setDraftDomain] = useState(".facebook.com");
  const [draftPass, setDraftPass] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("load");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareCloudPublished, setShareCloudPublished] = useState<boolean | null>(null);
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewModeState] = useState<HubViewMode>(() => readCookieViewMode());
  const filterToolbarKeyRef = useRef("");

  const setViewMode = useCallback((mode: HubViewMode) => {
    setViewModeState(mode);
    patchCookieViewMode(mode);
  }, []);
  const routeDetailDeepLinkDone = useRef(false);

  useEffect(() => {
    if (routeDetailDeepLinkDone.current || loading) return;
    const link = readCookieDeepLink();
    if (!link.openRouteDetail || !link.noteId || !link.domain) return;
    const domain = normalizeCookieDomain(link.domain);
    const binding = bindings.find(
      (b) => b.enabled && b.noteId === link.noteId && normalizeCookieDomain(b.domain) === domain,
    );
    if (!binding) return;
    routeDetailDeepLinkDone.current = true;
    setModal({ type: "detail", id: binding.id });
    onSelect?.(binding.id);
    const p = new URLSearchParams(window.location.search);
    p.delete("routeDetail");
    p.delete("detail");
    const q = p.toString();
    window.history.replaceState(null, "", q ? buildAppUrl("cookie", q) : buildAppUrl("cookie"));
  }, [bindings, loading, onSelect]);

  const editing = modal?.type === "edit" ? bindings.find((b) => b.id === modal.id) : null;
  const deleting = modal?.type === "delete" ? bindings.filter((b) => modal.ids.includes(b.id)) : [];
  const detailBinding = modal?.type === "detail" ? bindings.find((b) => b.id === modal.id) : null;
  const shareBinding = modal?.type === "share" ? bindings.find((b) => b.id === modal.id) : null;
  const granteeSharePreview = useMemo(() => formatGranteeSharePreview(shareEmail), [shareEmail]);
  const shareBlocked = shareCloudPublished === false;

  useEffect(() => {
    if (modal?.type !== "share" || !shareBinding || !session?.user?.id) {
      setShareCloudPublished(null);
      return;
    }
    let cancelled = false;
    void getCookieRoutePublishStatus(session, shareBinding).then((res) => {
      if (cancelled) return;
      setShareCloudPublished(res.ok ? res.published : false);
    });
    return () => {
      cancelled = true;
    };
  }, [modal?.type, session, shareBinding]);

  const selectedRow = useMemo(() => rows.find((row) => row.binding.id === selectedBindingId), [rows, selectedBindingId]);
  const detailRow = useMemo(() => {
    if (!detailBinding) return null;
    const hit = rows.find((row) => row.binding.id === detailBinding.id);
    if (hit) return hit;
    const note = notesById.get(detailBinding.noteId);
    return {
      binding: detailBinding,
      note,
      lines: note ? cookieLines(note.cookie_snapshot) : [],
    };
  }, [detailBinding, notesById, rows]);
  const filteredRows = useMemo(
    () => filterCookieRows(rows, routeQuery, filterValues, period, vaultByKey),
    [filterValues, period, routeQuery, rows, vaultByKey],
  );
  // table-only-directory — sort via list prefs until cookie columns map to useDirectoryTableSort
  const sortedFilteredRows = useMemo(
    () => sortCookieAutoRows(filteredRows, listPrefs.sort),
    [filteredRows, listPrefs.sort],
  );

  const cookieTableSortDir: HubSortDir =
    listPrefs.sort === "platform" || listPrefs.sort === "title" ? "asc" : "desc";

  const handleCookieTableSort = useCallback((sort: CookieListSort) => {
    setListPrefs({ sort });
    patchCookieListPrefs({ csort: sort === DEFAULT_COOKIE_LIST_SORT ? null : sort });
  }, []);

  const routeFiltersWithCounts = useMemo(
    () => cookieRouteFiltersWithCounts(rows, routeQuery, filterValues, period, vaultByKey),
    [filterValues, period, routeQuery, rows, vaultByKey],
  );

  const selectedBindings = useMemo(
    () => bindings.filter((binding) => selectedIds.includes(binding.id)),
    [bindings, selectedIds],
  );
  const routeKpis = useMemo<KpiTileData[]>(() => {
    const lockedTotal = rows.filter((row) => row.binding.sourceBrowserId).length;
    const ownerTotal = rows.filter(
      (row) => row.binding.accessRole !== "member" && !row.binding.sourceBrowserId,
    ).length;
    const lockedShown = sortedFilteredRows.filter((row) => row.binding.sourceBrowserId).length;
    const ownerShown = sortedFilteredRows.filter(
      (row) => row.binding.accessRole !== "member" && !row.binding.sourceBrowserId,
    ).length;
    const all: KpiTileData[] = [
      {
        prefKey: "routes_shown",
        label: "Routes (shown)",
        value: sortedFilteredRows.length,
        hint: sortedFilteredRows.length < rows.length ? `${rows.length} total` : undefined,
        icon: LayoutGrid,
        tone: "indigo",
      },
      {
        prefKey: "locked_browser",
        label: "Locked browser",
        value: lockedShown,
        hint: lockedShown < lockedTotal ? `${lockedTotal} total` : undefined,
        icon: LockKeyhole,
        tone: "emerald",
      },
      {
        prefKey: "owner_routes",
        label: "Owner routes",
        value: ownerShown,
        hint: ownerShown < ownerTotal ? `${ownerTotal} total` : undefined,
        icon: Shield,
        tone: "emerald",
      },
    ];
    return all.filter((item) => item.prefKey && visKpi.has(item.prefKey));
  }, [sortedFilteredRows, rows, visKpi]);
  const charts = useMemo(
    () => buildCookieChartItems(sortedFilteredRows, vaultByKey, shareCounts),
    [sortedFilteredRows, shareCounts, vaultByKey],
  );

  const chartsBand = useMemo(
    () =>
      directoryChartBandNode({
        visCharts,
        defs: COOKIE_CHART_DEFS,
        data: {
          status_bar: charts.statusItems,
          platform_bar: charts.platformItems,
          share_bar: charts.shareItems,
        },
      }),
    [charts.platformItems, charts.shareItems, charts.statusItems, visCharts],
  );

  const kpiSig = useMemo(
    () => kpiTilesSignature(routeKpis.length > 0 ? routeKpis : undefined),
    [routeKpis],
  );
  const chartsDepKey = useMemo(() => {
    const visible = chartKeysSignature(visCharts, COOKIE_CHART_ORDER);
    if (!visible) return "";
    const parts: string[] = [];
    if (visCharts.has("status_bar")) parts.push(barChartSeriesSignature(charts.statusItems));
    if (visCharts.has("platform_bar")) parts.push(barChartSeriesSignature(charts.platformItems));
    if (visCharts.has("share_bar")) parts.push(barChartSeriesSignature(charts.shareItems));
    return `${visible}|${parts.join(";")}`;
  }, [charts, visCharts]);

  const cookieHeaderKpi = useMemo(() => {
    const vaultRows = sortedFilteredRows
      .map((row) => lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain))
      .filter((vault): vault is CookieVaultRow => Boolean(vault));
    const vaultCookies = vaultRows.reduce((sum, vault) => sum + (vault.cookie_count ?? 0), 0);
    return {
      routesShown: sortedFilteredRows.length,
      routesTotal: rows.length,
      vaultCookies,
    };
  }, [sortedFilteredRows, rows.length, vaultByKey]);

  useEffect(() => {
    sanitizeCookieFilterUrl();
    setFilterValues(stripLegacyCookieFilterValues(filterValues));
  }, [filterValues, setFilterValues]);

  useEffect(() => subscribeHubListPrefs(() => {
    setPrefs(readCookieHubPrefs());
    setPeriod(readWorkspacePeriod("cookie", "all"));
    setListPrefs(readCookieListPrefs());
    setViewModeState(readCookieViewMode());
  }), []);

  useDirectoryBandSync(
    {
      kpis: routeKpis.length > 0 ? routeKpis : undefined,
      charts: chartsBand ?? null,
      sectionRuleLabel: "Routes",
      kpiKey: kpiSig,
      chartsKey: chartsDepKey,
    },
    { setDirectoryKpis, setDirectoryCharts, setSectionRuleLabel },
  );

  useEffect(() => {
    setCenterStats(buildCookieHeaderStats(visHeaderStats, cookieHeaderKpi));
  }, [cookieHeaderKpi, setCenterStats, visHeaderStats]);

  useEffect(() => {
    setFilters(routeFiltersWithCounts);
  }, [routeFiltersWithCounts, setFilters]);

  useEffect(() => {
    setToolbar(
      <WorkspaceDirectorySearchToolbar
        screen="cookie"
        screenFilters={routeFiltersWithCounts}
        workspacePeriod={{ scope: "cookie", defaultRange: "all", inactiveKeys: ["all"] }}
        showTimeRange={false}
        showRefresh={false}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        countIcon={Boxes}
        shown={sortedFilteredRows.length}
        total={rows.length}
        countLabel="routes"
      />,
    );
  }, [rows.length, routeFiltersWithCounts, setToolbar, setViewMode, sortedFilteredRows.length, viewMode]);

  useEffect(
    () => () => {
      filterToolbarKeyRef.current = "";
      setFilters([]);
      setToolbar(null);
      setFilterToolbar(null);
      setCenterStats([]);
    },
    [setCenterStats, setFilterToolbar, setFilters, setToolbar],
  );

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => bindings.some((binding) => binding.id === id)));
  }, [bindings]);

  const shareCountKey = useMemo(
    () =>
      rows
        .map((row) => `${row.binding.noteId}:${row.binding.accessRole ?? "owner"}:${row.binding.canManage === false ? "no" : "yes"}`)
        .join("|"),
    [rows],
  );

  useEffect(() => {
    let cancelled = false;
    const uniqueNoteIds = Array.from(
      new Set(
        shareCountKey
          .split("|")
          .filter(Boolean)
          .map((part) => {
            const [noteId, role, manage] = part.split(":");
            if (!noteId || role === "member" || manage === "no") return null;
            return noteId;
          })
          .filter((noteId): noteId is string => Boolean(noteId)),
      ),
    );
    if (!uniqueNoteIds.length) {
      setShareCounts({});
      return;
    }

    const cachedSeed: Record<string, number> = {};
    for (const noteId of uniqueNoteIds) {
      const hit = getResolvedNoteCookieMembers(noteId);
      if (hit) cachedSeed[noteId] = hit.ok ? hit.members.length : 0;
    }
    if (Object.keys(cachedSeed).length) {
      setShareCounts((prev) => ({ ...prev, ...cachedSeed }));
    }

    prefetchNoteCookieMembersBatch(uniqueNoteIds);

    const loadShareCounts = () => {
      void listNoteCookieMemberCounts(uniqueNoteIds).then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setShareCounts((prev) => {
            const next = { ...prev };
            for (const row of res.counts) next[row.note_id] = row.member_count;
            return next;
          });
          return;
        }
        // Fallback when RPC not deployed yet.
        void Promise.all(
          uniqueNoteIds.map(async (noteId) => {
            const r = await fetchNoteCookieMembers(noteId);
            const count = r.ok ? r.members.length : 0;
            return [noteId, count] as const;
          }),
        ).then((entries) => {
          if (cancelled) return;
          setShareCounts((prev) => {
            const next = { ...prev };
            for (const [noteId, count] of entries) next[noteId] = count;
            return next;
          });
        });
      });
    };

    const timerId = window.setTimeout(loadShareCounts, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [shareCountKey]);

  const refreshShareCount = useCallback(async (noteId: string) => {
    if (!noteId) return;
    const res = await fetchNoteCookieMembers(noteId, { refresh: true });
    if (!res.ok) return;
    setShareCounts((prev) => ({ ...prev, [noteId]: res.members.length }));
  }, []);

  useEffect(() => {
    const onShared = (event: Event) => {
      const noteId = (event as CustomEvent<{ noteId?: string }>).detail?.noteId;
      if (noteId) void refreshShareCount(noteId);
    };
    window.addEventListener("p0020-cookie-route-shared", onShared);
    return () => window.removeEventListener("p0020-cookie-route-shared", onShared);
  }, [refreshShareCount]);

  useEffect(
    () => {
      const unsubscribe = subscribeNoteCookieMembersCache(() => {
        setShareCounts((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const noteId of Object.keys(prev)) {
            const hit = getCachedNoteCookieMembers(noteId);
            if (!hit?.ok) continue;
            const count = hit.members.length;
            if (next[noteId] !== count) {
              next[noteId] = count;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      });
      return () => {
        unsubscribe();
      };
    },
    [],
  );

  const openAdd = useCallback(() => {
    setDraftNoteId(notes[0]?.id ?? "");
    setDraftDomain(".facebook.com");
    setDraftPass("");
    setModal({ type: "add" });
  }, [notes]);

  const openEdit = useCallback((binding: CookieBinding) => {
    setDraftNoteId(binding.noteId);
    setDraftDomain(binding.domain);
    setDraftPass(binding.pass ?? "");
    setModal({ type: "edit", id: binding.id });
  }, []);

  const submitAdd = () => {
    if (!onAdd || !draftNoteId.trim()) return;
    onAdd(draftNoteId.trim(), draftDomain.trim(), draftPass.trim());
    setModal(null);
    setDraftPass("");
  };

  const openRouteDetail = useCallback(
    (bindingId: string, noteId: string) => {
      prefetchNoteCookieMembers(noteId);
      onSelect?.(bindingId);
      setModal({ type: "detail", id: bindingId });
    },
    [onSelect],
  );

  const openShare = useCallback(
    (binding: CookieBinding) => {
      if (!session?.user?.id) {
        pushToast("Sign in to share routes.", "warn");
        return;
      }
      void getCookieRoutePublishStatus(session, binding).then((res) => {
        const published = res.ok ? res.published : false;
        setShareCloudPublished(published);
        if (!published) {
          pushToast("Route is not published to cloud yet — save the route first, then share.", "warn", 8000);
          return;
        }
        setShareEmail("");
        setShareRole("load");
        setModal({ type: "share", id: binding.id });
      });
    },
    [pushToast, session],
  );

  const submitShare = async () => {
    if (!shareBinding?.noteId || !shareEmail.trim() || shareBusy) return;
    setShareBusy(true);
    const res = await upsertNoteCookieMember({
      noteId: shareBinding.noteId,
      email: shareEmail,
      ...sharePermissions(shareRole),
    });
    if (!res.ok) {
      setShareBusy(false);
      pushToast(res.error, "error", 8000);
      return;
    }
    const published = onEnsureRoutePublished ? await onEnsureRoutePublished(shareBinding) : true;
    setShareBusy(false);
    const granteeEmail = res.member.grantee_email ?? shareEmail.trim();
    setShareEmail("");
    setModal(null);
    void refreshShareCount(shareBinding.noteId);
    onRefresh?.();
    if (!published) {
      pushToast(
        `Added ${granteeEmail}, but cloud publish failed — recipient cannot load until the route is saved to cloud.`,
        "warn",
        8000,
      );
      return;
    }
    pushToast(
      res.member.grantee_user_id
        ? `Shared with ${granteeEmail}. Recipient can refresh routes immediately.`
        : `Shared with ${granteeEmail}. Recipient must sign in with that email, then Refresh routes.`,
      "success",
    );
  };

  const submitEdit = () => {
    if (!onUpdate || !editing) return;
    const note = notesById.get(draftNoteId);
    onUpdate(editing.id, {
      noteId: draftNoteId,
      syncId: note?.sync_id ?? editing.syncId,
      noteTitle: note?.title ?? editing.noteTitle,
      requiresPass: Boolean(note?.sync_pass_hash),
      domain: draftDomain.trim(),
      pass: draftPass.trim() || undefined,
      useNoteIdRpc: !note?.sync_id?.trim() && Boolean(draftNoteId),
    });
    setModal(null);
  };

  const submitDelete = () => {
    if (!onRemove || !deleting.length) return;
    deleting.forEach((binding) => onRemove(binding.id));
    setSelectedIds((prev) => prev.filter((id) => !deleting.some((binding) => binding.id === id)));
    setModal(null);
  };

  const toggleSelected = (bindingId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(bindingId) ? prev : [...prev, bindingId];
      return prev.filter((id) => id !== bindingId);
    });
    onSelect?.(bindingId);
  };

  const editTarget = selectedBindings.length === 1 ? selectedBindings[0] : selectedRow?.binding;
  const shareTarget = selectedBindings.length === 1 ? selectedBindings[0] : selectedRow?.binding;
  const canShareTarget = Boolean(shareTarget && shareTarget.accessRole !== "member" && shareTarget.canManage !== false);
  const deleteTargetIds = useMemo(
    () => (selectedIds.length ? selectedIds : selectedBindingId ? [selectedBindingId] : []),
    [selectedBindingId, selectedIds],
  );

  const routeFilterResetKey = hubDirectoryListResetKey(
    routeQuery,
    filterValues,
    period,
    listPrefs.sort,
    sortedFilteredRows.length,
  );

  const filterToolbarKey = [
    toolbarActionsKey,
    onAdd ? "add" : "",
    onUpdate ? "update" : "",
    onRemove ? "remove" : "",
    onRefresh ? "refresh" : "",
    editTarget?.id ?? "",
    shareTarget?.id ?? "",
    canShareTarget ? "share" : "",
    selectedBindings.length,
    deleteTargetIds.join(","),
  ].join("|");
  useEffect(() => {
    if (filterToolbarKeyRef.current === filterToolbarKey) return;
    filterToolbarKeyRef.current = filterToolbarKey;
    setFilterToolbar(
      <>
        {toolbarActions}
          {onAdd ? (
            <button
              type="button"
            className="inline-flex h-[var(--hub-control-h)] items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 text-xs font-medium text-indigo-100 hover:bg-indigo-500/30"
            onClick={openAdd}
            >
              <Plus size={12} />
              Add route
            </button>
          ) : null}
        {shareTarget ? (
          <button
            type="button"
            className="inline-flex h-[var(--hub-control-h)] items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
            disabled={!canShareTarget}
            title={canShareTarget ? "Share selected route" : "Only route owner/manager can share"}
            onClick={() => canShareTarget && shareTarget && openShare(shareTarget)}
          >
            <UserPlus size={12} />
            Share
          </button>
        ) : null}
        {onUpdate ? (
          <button
            type="button"
            className="inline-flex h-[var(--hub-control-h)] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5 disabled:opacity-50"
            disabled={!editTarget || selectedBindings.length > 1}
            title={selectedBindings.length > 1 ? "Edit supports one selected route" : "Edit selected route"}
            onClick={() => editTarget && openEdit(editTarget)}
          >
            <Pencil size={12} />
            Edit
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            className="inline-flex h-[var(--hub-control-h)] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-rose-300 hover:bg-white/5 disabled:opacity-50"
            disabled={deleteTargetIds.length === 0}
            onClick={() => setModal({ type: "delete", ids: deleteTargetIds })}
          >
            <Trash2 size={12} />
            Delete{deleteTargetIds.length > 1 ? ` ${deleteTargetIds.length}` : ""}
          </button>
        ) : null}
          {onRefresh ? (
          <button
            type="button"
            className="inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5"
            onClick={onRefresh}
          >
              <RefreshCw size={12} />
              Refresh
            </button>
          ) : null}
      </>,
    );
  }, [
    deleteTargetIds,
    editTarget,
    filterToolbarKey,
    canShareTarget,
    onAdd,
    openAdd,
    openEdit,
    openShare,
    onRefresh,
    onRemove,
    onUpdate,
    selectedBindings.length,
    shareTarget,
    setFilterToolbar,
    toolbarActions,
    toolbarActionsKey,
  ]);

  return (
    <>
      {bindings.length === 0 && loading ? <CookieDirectorySkeleton /> : null}
      {modal?.type === "add" && onAdd ? (
        <CookieRouteFormModal
          toc={COOKIE_ROUTE_ADD_TOC}
          idPrefix="rt-add-"
          title="Add route"
          headerIcon={Plus}
          onClose={() => setModal(null)}
          footer={
            <CookieRouteModalActions
              primaryLabel="Create cloud route"
              primaryIcon={Plus}
              primaryDisabled={!draftNoteId.trim()}
              onPrimary={submitAdd}
              onSecondary={() => setModal(null)}
            />
          }
        >
          <CookieRouteModalSection
            id="rt-add-create"
            title={cookieRouteSectionTitle(COOKIE_ROUTE_ADD_TOC, "create")}
          >
            <p className="cookie-route-modal__note">Create a new cloud cookie route for the selected note and domain.</p>
            <div className={HUB_TOOL_DETAIL_FORM_GRID_3_CLASS}>
              <HubModalFilterField
                filterKey="note"
                label="Target note"
                icon={FileText}
                value={draftNoteId}
                options={noteSelectOptions}
                onChange={setDraftNoteId}
              />
              <label className="block min-w-0">
                <HubFormFieldLabel icon={Globe2}>Auto domain</HubFormFieldLabel>
                <input
                  className="field auth-gate-field font-mono w-full"
                  value={draftDomain}
                  onChange={(e) => setDraftDomain(e.target.value)}
                />
              </label>
              <label className="block min-w-0">
                <HubFormFieldLabel icon={LockKeyhole}>Sync pass (optional)</HubFormFieldLabel>
                <input
                  type="password"
                  className="field auth-gate-field w-full"
                  value={draftPass}
                  onChange={(e) => setDraftPass(e.target.value)}
                />
              </label>
            </div>
            <div className="cookie-route-modal__presets">
              {DOMAIN_PRESETS.map((p) => (
                <button
                  key={p.domain}
                  type="button"
                  className="cookie-route-modal__preset-btn"
                  onClick={() => setDraftDomain(p.domain)}
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </CookieRouteModalSection>
        </CookieRouteFormModal>
      ) : null}

      {modal?.type === "share" && shareBinding ? (
        <CookieRouteFormModal
          toc={COOKIE_ROUTE_SHARE_TOC}
          idPrefix="rt-share-"
          title="Add user"
          headerIcon={UserPlus}
          onClose={() => setModal(null)}
          footer={
            <CookieRouteModalActions
              primaryLabel="Share"
              primaryIcon={UserPlus}
              primaryBusy={shareBusy}
              primaryDisabled={!shareEmail.trim() || shareBlocked}
              onPrimary={() => void submitShare()}
              onSecondary={() => setModal(null)}
            />
          }
        >
          <CookieRouteModalSection
            id="rt-share-route"
            title={cookieRouteSectionTitle(COOKIE_ROUTE_SHARE_TOC, "route")}
          >
            <div className="cookie-route-modal__route-card">
              <div className="min-w-0">
                <p className="cookie-route-modal__route-card-title">{shareBinding.noteTitle ?? "Cookie route"}</p>
                <p className="cookie-route-modal__route-card-meta">{shareBinding.noteId}</p>
              </div>
              <button
                type="button"
                className="cookie-route-modal__copy-btn"
                onClick={() => void navigator.clipboard?.writeText(shareBinding.noteId)}
              >
                Copy Note ID
              </button>
            </div>
          </CookieRouteModalSection>
          <CookieRouteModalSection
            id="rt-share-grant"
            title={cookieRouteSectionTitle(COOKIE_ROUTE_SHARE_TOC, "grant")}
          >
            <p className="cookie-route-modal__note">
              Enter Hub User ID (e.g. CS00642) or email — User ID maps to the workspace auth email automatically.
            </p>
            {shareBlocked ? (
              <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
                Route is not published to cloud. Save the route from the directory first.
              </p>
            ) : null}
            <div className={HUB_TOOL_DETAIL_FORM_GRID_3_CLASS}>
              <label className="block min-w-0">
                <HubFormFieldLabel icon={Mail}>User ID or email</HubFormFieldLabel>
                <input
                  className="field auth-gate-field w-full"
                  value={shareEmail}
                  placeholder="CS00642 or user@example.com"
                  onChange={(event) => setShareEmail(event.target.value)}
                />
                {granteeSharePreview ? (
                  <p className="mt-1 text-[10px] text-indigo-200/80">{granteeSharePreview}</p>
                ) : null}
              </label>
              <HubModalFilterField
                filterKey="access"
                label="Access"
                icon={Shield}
                value={shareRole}
                options={COOKIE_ACCESS_SELECT_OPTIONS}
                onChange={(v) => setShareRole(v as ShareRole)}
              />
            </div>
          </CookieRouteModalSection>
        </CookieRouteFormModal>
      ) : null}

      <P0020DirectoryScreen
          items={sortedFilteredRows}
          viewMode={viewMode}
          resetKey={routeFilterResetKey}
          cardGridAriaLabel="Route cards pages"
          empty={
            <p className="hub-users-empty rounded-lg border border-white/5 bg-white/[.02] px-3 py-6 text-center text-[12px] text-[var(--muted)]">
              {rows.length === 0 ? "No active routes — click Add route." : "No routes match search or filters."}
            </p>
          }
          renderCard={(row) => {
            const vault = row.binding.noteId
              ? lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain)
              : undefined;
            const checked = selectedIds.includes(row.binding.id);
            return (
              <CookieRouteCard
                key={row.binding.id}
                row={row}
                vault={vault}
                shareCount={shareCounts[row.binding.noteId]}
                checked={checked}
                onOpen={() => openRouteDetail(row.binding.id, row.binding.noteId)}
                onSelect={() => onSelect?.(row.binding.id)}
                onCheck={(next) => toggleSelected(row.binding.id, next)}
              />
            );
          }}
          table={
            <CookieRoutesDirectoryTable
              rows={sortedFilteredRows}
              resetKey={routeFilterResetKey}
              loading={loading}
              totalRowCount={rows.length}
              selectedIds={selectedIds}
              selectedBindingId={selectedBindingId}
              vaultByKey={vaultByKey}
              shareCounts={shareCounts}
              sortKey={listPrefs.sort}
              sortDir={cookieTableSortDir}
              onSort={handleCookieTableSort}
              onSelect={onSelect}
              onOpenDetail={openRouteDetail}
              onToggleSelect={toggleSelected}
            />
          }
        />

      {detailRow ? (
        <CookieRouteDetailModal
          row={detailRow}
          vault={lookupVaultRow(vaultByKey, detailRow.binding.noteId, detailRow.binding.domain)}
          renderDetail={renderDetail}
          renderAccessDetail={renderAccessDetail}
          onClose={() => setModal(null)}
        />
      ) : null}

      {editing && onUpdate ? (
        <CookieRouteFormModal
          toc={COOKIE_ROUTE_EDIT_TOC}
          idPrefix="rt-edit-"
          title="Edit route"
          headerIcon={Pencil}
          onClose={() => setModal(null)}
          footer={
            <CookieRouteModalActions
              primaryLabel="Save cloud route"
              primaryIcon={Save}
              onPrimary={submitEdit}
              secondaryLabel="Close"
              onSecondary={() => setModal(null)}
            />
          }
        >
          <CookieRouteModalSection
            id="rt-edit-route"
            title={cookieRouteSectionTitle(COOKIE_ROUTE_EDIT_TOC, "route")}
          >
            <p className="cookie-route-modal__note">
              Update route metadata. Advanced diagnostics are available in route detail when needed.
            </p>
            <div className={HUB_TOOL_DETAIL_FORM_GRID_3_CLASS}>
              <HubModalFilterField
                filterKey="note"
                label="Note"
                icon={FileText}
                value={draftNoteId}
                options={noteSelectOptions}
                onChange={setDraftNoteId}
              />
              <label className="block min-w-0">
                <HubFormFieldLabel icon={Globe2}>Domain</HubFormFieldLabel>
                <input
                  className="field auth-gate-field font-mono w-full"
                  value={draftDomain}
                  onChange={(e) => setDraftDomain(e.target.value)}
                />
              </label>
              <label className="block min-w-0">
                <HubFormFieldLabel icon={LockKeyhole}>Sync pass</HubFormFieldLabel>
                <input
                  type="password"
                  className="field auth-gate-field w-full"
                  placeholder={editing.requiresPass ? "Required" : "Optional"}
                  value={draftPass}
                  onChange={(e) => setDraftPass(e.target.value)}
                />
              </label>
            </div>
          </CookieRouteModalSection>
        </CookieRouteFormModal>
      ) : null}

      {deleting.length > 0 && onRemove ? (
        <CookieRouteFormModal
          title={deleting.length > 1 ? `Delete ${deleting.length} routes` : "Delete route"}
          subtitle="This disables the cloud route so linked browsers remove it on the next realtime refresh. Existing vault data is not deleted."
          headerIcon={Trash2}
          headerIconClassName="text-rose-300"
          onClose={() => setModal(null)}
          footer={
            <CookieRouteModalActions
              primaryLabel="Delete route"
              primaryIcon={Trash2}
              danger
              onPrimary={submitDelete}
              onSecondary={() => setModal(null)}
            />
          }
        >
          <p className="cookie-route-modal__warn">
            Remove{" "}
            {deleting.length === 1 ? (
              <>
                <span className="font-mono">{deleting[0].domain}</span> for{" "}
                <strong>{deleting[0].noteTitle ?? deleting[0].noteId}</strong>?
              </>
            ) : (
              <strong>{deleting.length} selected routes</strong>
            )}
          </p>
        </CookieRouteFormModal>
      ) : null}
    </>
  );
}
