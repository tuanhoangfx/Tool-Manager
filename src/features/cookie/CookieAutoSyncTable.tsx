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
  HubModalFilterField,
  HubFormFieldLabel,
  HubToolDetailModal,
  HubToolDetailSection,
  HubTableColumnHeader,
  HUB_TOOL_DETAIL_FORM_GRID_3_CLASS,
  HUB_TOOL_DETAIL_SCROLL_ROOT,
  HUB_TOOL_DETAIL_SECTIONS_CLASS,
} from "@tool-workspace/hub-ui";
import {
  COOKIE_ROUTE_ADD_TOC,
  COOKIE_ROUTE_EDIT_TOC,
  COOKIE_ROUTE_SHARE_TOC,
  cookieRouteSectionTitle,
} from "./cookie-route-form-toc";
import { COOKIE_ACCESS_SELECT_OPTIONS } from "./cookieAccessSelectOptions";
import {
  Activity,
  Boxes,
  Check,
  Cookie,
  Copy,
  Database,
  FileText,
  Info,
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
  HubResultCount,
  HubTimeRangeSelect,
  MetricBadge,
  MiniBarChart,
  MiniDonut,
  ViewToggle,
  type HubViewMode,
  type KpiTileData,
  type MetricBadgeTone,
} from "../../components/sales-shell";
import { TocSectionNav } from "../overview/TocSectionNav";
import { TocHighlightContent, TocSectionHighlightProvider } from "../overview/toc-section-highlight-context";
import { COOKIE_ROUTE_DETAIL_TOC, cookieRouteDetailSectionTitle } from "./cookie-route-detail-toc";
import { useWorkspaceSearch } from "../workspace/WorkspaceSearchContext";
import type { NoteListItem } from "../notes/types";
import { routeMatchesTimeRange } from "./cookie-route-activity";
import { fetchNoteCookieSnapshot } from "../notes/notesRepository";
import { cookieLines } from "../notes/noteUtils";
import { DOMAIN_PRESETS, normalizeCookieDomain, type CookieBinding } from "./cookieBridge";
import { readCookieDeepLink } from "./cookieDeepLink";
import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import { buildAppUrl } from "../../lib/workspace-path";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { readCookieHubPrefs } from "./cookie-tab-prefs";
import { buildCookieChartItems } from "./cookie-aggregates";
import { cookieRouteFiltersWithCounts, filterCookieRows } from "./cookie-route-filter-counts";
import {
  DEFAULT_COOKIE_CHART_KEYS,
  DEFAULT_COOKIE_HEADER_STAT_KEYS,
  DEFAULT_COOKIE_KPI_KEYS,
} from "./cookie-display-prefs";
import { buildCookieHeaderStats } from "./cookie-header-metrics";
import {
  RouteLockChip,
  RouteShareChip,
  RouteStatChip,
  RouteSyncChip,
  RouteVaultChip,
} from "./cookieRouteStatChips";

function visibleSet(set: Set<string> | null, defaults: Set<string>) {
  return set ?? defaults;
}
import { listNoteCookieMembers, upsertNoteCookieMember } from "./noteCookieMembersRepository";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { lookupVaultRow } from "./useCookieVaultMap";
import { formatTimestampCompact, formatTimestampCompactOrDash } from "../../lib/format-timestamp";
import { resolveRouteSyncedDisplayIso } from "./route-sync-display";

export type CookieAutoRow = {
  binding: CookieBinding;
  note: NoteListItem | undefined;
  lines: string[];
};

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
  vaultByKey?: Record<string, CookieVaultRow>;
  vaultError?: string | null;
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

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "";
}

function ownerLabel(binding: CookieBinding) {
  return binding.ownerUserEmail?.trim() || (binding.ownerUserId ? shortId(binding.ownerUserId) : "Current user");
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

function CompactField({
  label,
  value,
  mono,
  copyField,
  copyValue,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyField?: string;
  copyValue?: string | null;
  onCopy?: (field: string, value: string) => void;
  copied?: boolean;
}) {
  return (
    <div className="rdp-compact-item">
      <span className="rdp-compact-label">{label}</span>
      <span className={mono ? "rdp-compact-value mono" : "rdp-compact-value"} title={value}>
        {value}
      </span>
      {copyField && copyValue && onCopy ? (
        <button type="button" className="rdp-copy rdp-copy--inline" onClick={() => onCopy(copyField, copyValue)} title={`Copy ${label}`}>
          <Copy size={10} />
          {copied ? "Copied" : "Copy"}
        </button>
      ) : null}
    </div>
  );
}

function siteIcon(domain: string) {
  return resolveCookieSiteIcon(domain);
}

function sharePermissions(role: ShareRole) {
  return {
    canApply: true,
    canPublish: role === "sync",
    canManage: false,
  };
}

function RouteMetaRow({
  icon: Icon,
  tint,
  children,
}: {
  icon: ElementType<{ size?: number; className?: string; strokeWidth?: number; style?: CSSProperties }>;
  tint: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} className="shrink-0" strokeWidth={2} style={{ color: tint, opacity: 0.72 }} />
      <div className="min-w-0 flex-1 truncate">{children}</div>
    </div>
  );
}

function CookieRouteCard({
  row,
  vault,
  selected,
  checked,
  shareCount,
  onOpen,
  onSelect,
  onCheck,
}: {
  row: CookieAutoRow;
  vault?: CookieVaultRow;
  selected: boolean;
  checked: boolean;
  shareCount?: number;
  onOpen: () => void;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
}) {
  const { binding, note, lines } = row;
  const status = note?.sync_status ?? "pending";
  const syncedIso = resolveRouteSyncedDisplayIso({ noteSyncedAt: note?.synced_at });
  const sourceLocked = Boolean(binding.sourceBrowserId);
  const dot = sourceLocked ? "#22c55e" : status === "pending" ? "#f59e0b" : "#818cf8";
  const icon = siteIcon(binding.domain);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-full min-h-[220px] w-full flex-col rounded-xl border bg-[var(--panel)] p-4 text-left transition-[border-color,box-shadow,background-color] duration-200 hover:border-indigo-500/40 hover:bg-white/[0.02] hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)] ${
        selected || checked ? "border-indigo-500/35 shadow-[0_0_18px_rgba(99,102,241,0.10)]" : "border-white/5"
      }`}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative shrink-0">
            <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/[.04] text-indigo-200">
              {icon ? (
                <img
                  src={icon.src}
                  alt={icon.label}
                  className="relative h-5 w-5 object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <Cookie size={16} className="opacity-75" />
              )}
            </div>
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--panel)]"
              style={{ background: dot }}
              title={sourceLocked ? "Locked browser" : status}
            />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="rounded border border-white/10 bg-white/[.04] px-1.5 py-0.5 text-[9px] font-medium text-indigo-200">
                {icon?.label ?? "Cookie"}
              </span>
              <span className="min-w-0 line-clamp-2 text-sm font-medium leading-snug text-[var(--text)]">
                {binding.noteTitle ?? note?.title ?? "Untitled route"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <span
            role="checkbox"
            aria-checked={checked}
            tabIndex={0}
            title="Select route"
            className={`grid h-5 w-5 place-items-center rounded-full border transition-all duration-200 ${
              checked
                ? "border-emerald-300/80 bg-emerald-500/35 text-emerald-50 shadow-[0_0_0_2px_rgba(34,197,94,0.12)]"
                : "border-white/20 bg-white/[.035] text-transparent hover:border-emerald-300/60 hover:bg-emerald-500/15"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onCheck(!checked);
              onSelect();
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              event.stopPropagation();
              onCheck(!checked);
              onSelect();
            }}
          >
            <Check size={10} strokeWidth={3} />
          </span>
        </div>
      </div>

      <div className="min-h-[5.8rem] shrink-0 space-y-1.5 text-xs text-[var(--muted)]">
        <RouteMetaRow icon={Link2} tint="#38bdf8">
          <span className="truncate font-mono text-indigo-300/90">{binding.domain}</span>
        </RouteMetaRow>
        <RouteMetaRow icon={FileText} tint="#a78bfa">
          <span className="truncate">{binding.syncId || (binding.useNoteIdRpc ? "by UUID" : binding.noteId)}</span>
        </RouteMetaRow>
        <RouteMetaRow icon={Database} tint="#34d399">
          <span className="font-medium text-[var(--text)]">
            {vault ? `Cloud vault · ${vault.cookie_count} cookies` : "No cloud vault"}
          </span>
        </RouteMetaRow>
        <RouteMetaRow icon={RefreshCw} tint="#818cf8">
          {formatTimestampCompact(syncedIso) ? (
            <span className="font-medium text-indigo-200/90" title={syncedIso ?? undefined}>
              {formatTimestampCompact(syncedIso)}
            </span>
          ) : (
            <span className="text-[var(--muted)]">—</span>
          )}
        </RouteMetaRow>
      </div>

      <div className="mt-auto shrink-0 pt-3">
        <div className="flex min-h-[22px] flex-wrap items-center gap-1.5">
          <RouteSyncChip status={status} />
          <RouteVaultChip cookieCount={vault?.cookie_count} />
          <RouteShareChip binding={binding} shareCount={shareCount} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
          <span>Open access detail</span>
          <Pencil size={14} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </button>
  );
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

export function CookieRouteDetailModal({
  row,
  vault,
  renderDetail,
  renderAccessDetail,
  onClose,
}: {
  row: CookieAutoRow;
  vault?: CookieVaultRow;
  renderDetail?: (binding: CookieBinding) => ReactNode;
  renderAccessDetail?: (
    binding: CookieBinding,
    ctx?: { vault?: CookieVaultRow; noteSyncedAt?: string | null },
  ) => ReactNode;
  onClose: () => void;
}) {
  const { binding, note, lines } = row;
  const status = note?.sync_status ?? "pending";
  const idPrefix = `cookie-route-${binding.id}-`;
  const [snapshotLines, setSnapshotLines] = useState(lines);
  useEffect(() => {
    setSnapshotLines(lines);
  }, [lines]);

  useEffect(() => {
    const noteId = binding.noteId?.trim();
    if (!noteId) return;
    let cancelled = false;
    void fetchNoteCookieSnapshot(noteId).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setSnapshotLines(cookieLines(data.cookie_snapshot));
    });
    return () => {
      cancelled = true;
    };
  }, [binding.noteId]);
  const sectionItems = useMemo(
    () => COOKIE_ROUTE_DETAIL_TOC.map(({ id }) => `${idPrefix}${id}`),
    [idPrefix],
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const routeTitle = binding.noteTitle ?? note?.title ?? "Cookie route";
  const routeSite = siteIcon(binding.domain);

  const copyValue = useCallback(async (field: string, value: string | null | undefined) => {
    const text = value?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1400);
    } catch {
      // Clipboard can be unavailable in some embedded browser contexts.
    }
  }, []);

  return (
    <HubToolDetailModal
      open
      onClose={onClose}
      title={routeTitle}
      titleId={`cookie-route-${binding.id}`}
      headerLeading={
        routeSite ? (
          <img
            src={routeSite.src}
            alt=""
            width={32}
            height={32}
            className="user-access-modal__avatar h-8 w-8 shrink-0 rounded-lg object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="user-access-modal__avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-500/20" aria-hidden>
            <Globe2 size={18} className="text-indigo-200" />
          </span>
        )
      }
      headerTrailing={
        <span className="truncate font-mono text-[10px] text-[var(--muted)]">{binding.domain}</span>
      }
      toc={
        <TocSectionNav
          items={COOKIE_ROUTE_DETAIL_TOC}
          idPrefix={idPrefix}
          scrollRootSelector={HUB_TOOL_DETAIL_SCROLL_ROOT}
        />
      }
    >
      <TocSectionHighlightProvider sectionIds={sectionItems}>
        <TocHighlightContent className={HUB_TOOL_DETAIL_SECTIONS_CLASS}>
          <div className="flex flex-wrap gap-1.5">
            <RouteSyncChip status={status} />
            <RouteVaultChip cookieCount={vault?.cookie_count} />
          </div>

          <HubToolDetailSection id={`${idPrefix}about`} title={cookieRouteDetailSectionTitle("about")}>
                <div className="rdp-stat-strip">
                  <RouteSyncChip status={status} />
                  <RouteVaultChip cookieCount={vault?.cookie_count} />
                  <RouteLockChip locked={Boolean(binding.sourceBrowserId)} />
                  <RouteStatChip
                    icon={Activity}
                    label={binding.canApply === false ? "Apply blocked" : "Apply ready"}
                    tone={binding.canApply === false ? "warn" : "ok"}
                  />
                </div>
                <div className="rdp-compact-grid rdp-compact-grid--3">
                  <CompactField label="Domain" value={binding.domain} />
                  <CompactField
                    label="Sync ID"
                    value={binding.syncId || (binding.useNoteIdRpc ? "UUID" : "—")}
                    mono
                    copyField="sync"
                    copyValue={binding.syncId}
                    onCopy={copyValue}
                    copied={copiedField === "sync"}
                  />
                  <CompactField
                    label="Note ID"
                    value={binding.noteId ? shortId(binding.noteId) : "—"}
                    mono
                    copyField="note"
                    copyValue={binding.noteId}
                    onCopy={copyValue}
                    copied={copiedField === "note"}
                  />
                  <CompactField label="Role" value={binding.accessRole ?? "owner"} />
                  <CompactField label="Owner" value={ownerLabel(binding)} />
                  <CompactField
                    label="Vault updated"
                    value={formatTimestampCompactOrDash(vault?.updated_at)}
                  />
                  <CompactField label="Snapshot" value={snapshotLines.length ? `${snapshotLines.length} lines` : "—"} />
                  <CompactField
                    label="Publisher"
                    value={binding.sourceLabel || (binding.sourceBrowserId ? shortId(binding.sourceBrowserId) : "Owner")}
                    mono={Boolean(binding.sourceBrowserId)}
                    copyField="source"
                    copyValue={binding.sourceBrowserId}
                    onCopy={copyValue}
                    copied={copiedField === "source"}
                  />
                  <CompactField label="Last user" value={vault?.updated_by || "—"} />
                </div>
              </HubToolDetailSection>

              <HubToolDetailSection id={`${idPrefix}access`} title={cookieRouteDetailSectionTitle("access")}>
                {renderAccessDetail
                  ? renderAccessDetail(binding, { vault, noteSyncedAt: note?.synced_at ?? null })
                  : renderDetail
                    ? renderDetail(binding)
                    : <p className="text-[12px] text-[var(--muted)]">No access detail.</p>}
              </HubToolDetailSection>
        </TocHighlightContent>
      </TocSectionHighlightProvider>
    </HubToolDetailModal>
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
  vaultByKey = {},
  vaultError,
  toolbarActions,
  toolbarActionsKey = "",
  renderDetail,
  renderAccessDetail,
}: Props) {
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
    setToolbar,
    setFilterToolbar,
    setDirectoryKpis,
    setDirectoryCharts,
    setSectionRuleLabel,
    setCenterStats,
  } = useWorkspaceSearch();
  const [prefs, setPrefs] = useState(readCookieHubPrefs);
  const visKpi = visibleSet(prefs.kpi, DEFAULT_COOKIE_KPI_KEYS);
  const visCharts = visibleSet(prefs.charts, DEFAULT_COOKIE_CHART_KEYS);
  const visHeaderStats = prefs.headerStats ?? DEFAULT_COOKIE_HEADER_STAT_KEYS;
  const [modal, setModal] = useState<RouteModalState>(null);
  const [draftNoteId, setDraftNoteId] = useState("");
  const [draftDomain, setDraftDomain] = useState(".facebook.com");
  const [draftPass, setDraftPass] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("load");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<HubViewMode>("card");
  const toolbarKeyRef = useRef("");
  const filterToolbarKeyRef = useRef("");
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
  const selectedRow = useMemo(() => rows.find((row) => row.binding.id === selectedBindingId), [rows, selectedBindingId]);
  const detailRow = useMemo(
    () => (detailBinding ? rows.find((row) => row.binding.id === detailBinding.id) : null),
    [detailBinding, rows],
  );
  const filteredRows = useMemo(
    () => filterCookieRows(rows, routeQuery, filterValues, prefs.range),
    [filterValues, prefs.range, routeQuery, rows],
  );

  const routeFiltersWithCounts = useMemo(
    () => cookieRouteFiltersWithCounts(rows, routeQuery, filterValues, prefs.range),
    [filterValues, prefs.range, routeQuery, rows],
  );

  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.binding.id));
  const selectedBindings = useMemo(
    () => bindings.filter((binding) => selectedIds.includes(binding.id)),
    [bindings, selectedIds],
  );
  const routeKpis = useMemo<KpiTileData[]>(() => {
    const vaultRows = filteredRows
      .map((row) => lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain))
      .filter((vault): vault is CookieVaultRow => Boolean(vault));
    const cookieCount = vaultRows.reduce((sum, vault) => sum + (vault.cookie_count ?? 0), 0);
    const lockedTotal = rows.filter((row) => row.binding.sourceBrowserId).length;
    const ownerTotal = rows.filter(
      (row) => row.binding.accessRole !== "member" && !row.binding.sourceBrowserId,
    ).length;
    const lockedShown = filteredRows.filter((row) => row.binding.sourceBrowserId).length;
    const ownerShown = filteredRows.filter(
      (row) => row.binding.accessRole !== "member" && !row.binding.sourceBrowserId,
    ).length;
    const all: KpiTileData[] = [
      {
        prefKey: "routes_shown",
        label: "Routes (shown)",
        value: filteredRows.length,
        hint: `${rows.length} total`,
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
        prefKey: "vault_cookies",
        label: "Vault cookies",
        value: cookieCount,
        icon: Database,
        tone: "amber",
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
  }, [filteredRows, rows, vaultByKey, visKpi]);
  const charts = useMemo(
    () => buildCookieChartItems(filteredRows, vaultByKey, shareCounts),
    [filteredRows, shareCounts, vaultByKey],
  );

  const hasCharts =
    visCharts.has("status_bar") ||
    visCharts.has("platform_bar") ||
    visCharts.has("cookies_bar") ||
    visCharts.has("access_donut") ||
    visCharts.has("share_donut");
  const chartsBand = hasCharts ? (
    <>
      {visCharts.has("status_bar") ? <MiniBarChart title="Sync status" items={charts.statusItems} /> : null}
      {visCharts.has("platform_bar") ? <MiniBarChart title="Routes by platform" items={charts.platformItems} /> : null}
      {visCharts.has("cookies_bar") ? (
        <MiniBarChart title="Cookies stored" items={charts.cookieItems} formatter={(n) => `${n} cookies`} />
      ) : null}
      {visCharts.has("access_donut") ? <MiniDonut title="Route access" items={charts.accessItems} /> : null}
      {visCharts.has("share_donut") ? <MiniDonut title="Route sharing" items={charts.shareItems} /> : null}
    </>
  ) : undefined;

  const cookieHeaderKpi = useMemo(() => {
    const vaultRows = filteredRows
      .map((row) => lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain))
      .filter((vault): vault is CookieVaultRow => Boolean(vault));
    const vaultCookies = vaultRows.reduce((sum, vault) => sum + (vault.cookie_count ?? 0), 0);
    return {
      routesShown: filteredRows.length,
      routesTotal: rows.length,
      vaultCookies,
    };
  }, [filteredRows, rows.length, vaultByKey]);

  useEffect(() => subscribeHubListPrefs(() => setPrefs(readCookieHubPrefs())), []);

  useEffect(() => {
    setDirectoryKpis(routeKpis.length > 0 ? routeKpis : undefined);
    setDirectoryCharts(chartsBand);
    setSectionRuleLabel("Routes");
    setCenterStats(buildCookieHeaderStats(visHeaderStats, cookieHeaderKpi));
  }, [
    chartsBand,
    cookieHeaderKpi,
    routeKpis,
    setCenterStats,
    setDirectoryCharts,
    setDirectoryKpis,
    setSectionRuleLabel,
    visHeaderStats,
  ]);

  useEffect(() => {
    setFilters(routeFiltersWithCounts);
    return () => {
      toolbarKeyRef.current = "";
      filterToolbarKeyRef.current = "";
      setFilters([]);
      setToolbar(null);
      setFilterToolbar(null);
      setDirectoryKpis(undefined);
      setDirectoryCharts(null);
      setSectionRuleLabel(undefined);
      setCenterStats([]);
    };
  }, [routeFiltersWithCounts, setCenterStats, setFilterToolbar, setFilters, setToolbar]);

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
    const ownerRows = rows.filter((row) => row.binding.noteId && row.binding.accessRole !== "member" && row.binding.canManage !== false);
    const uniqueNoteIds = Array.from(new Set(ownerRows.map((row) => row.binding.noteId)));
    if (!uniqueNoteIds.length) {
      setShareCounts({});
      return;
    }
    void Promise.all(
      uniqueNoteIds.map(async (noteId) => {
        const res = await listNoteCookieMembers(noteId);
        return [noteId, res.ok ? res.members.length : 0] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setShareCounts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [rows, shareCountKey]);

  const refreshShareCount = useCallback(async (noteId: string) => {
    if (!noteId) return;
    const res = await listNoteCookieMembers(noteId);
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

  const openShare = useCallback((binding: CookieBinding) => {
    setShareEmail("");
    setShareRole("load");
    setModal({ type: "share", id: binding.id });
  }, []);

  const submitShare = async () => {
    if (!shareBinding?.noteId || !shareEmail.trim() || shareBusy) return;
    setShareBusy(true);
    const res = await upsertNoteCookieMember({
      noteId: shareBinding.noteId,
      email: shareEmail,
      ...sharePermissions(shareRole),
    });
    setShareBusy(false);
    if (!res.ok) return;
    setShareEmail("");
    setModal(null);
    void refreshShareCount(shareBinding.noteId);
    onRefresh?.();
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

  const toggleAllVisible = (checked: boolean) => {
    const visibleIds = filteredRows.map((row) => row.binding.id);
    setSelectedIds((prev) => {
      if (!checked) return prev.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...prev, ...visibleIds]));
    });
    if (checked && visibleIds[0]) onSelect?.(visibleIds[0]);
  };

  const editTarget = selectedBindings.length === 1 ? selectedBindings[0] : selectedRow?.binding;
  const shareTarget = selectedBindings.length === 1 ? selectedBindings[0] : selectedRow?.binding;
  const canShareTarget = Boolean(shareTarget && shareTarget.accessRole !== "member" && shareTarget.canManage !== false);
  const deleteTargetIds = useMemo(
    () => (selectedIds.length ? selectedIds : selectedBindingId ? [selectedBindingId] : []),
    [selectedBindingId, selectedIds],
  );

  const toolbarKey = `${viewMode}:${prefs.range}:${filteredRows.length}:${rows.length}`;
  useEffect(() => {
    if (toolbarKeyRef.current === toolbarKey) return;
    toolbarKeyRef.current = toolbarKey;
    setToolbar(
      <>
        <HubTimeRangeSelect value={prefs.range} />
        <ViewToggle value={viewMode} onChange={setViewMode} />
        <HubResultCount icon={Boxes} shown={filteredRows.length} total={rows.length} />
      </>,
    );
  }, [filteredRows.length, prefs.range, rows.length, setToolbar, toolbarKey, viewMode]);

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
              primaryDisabled={!shareEmail.trim()}
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
              Grant Load or Sync access by email. Manage stays with route owner only.
            </p>
            <div className={HUB_TOOL_DETAIL_FORM_GRID_3_CLASS}>
              <label className="block min-w-0">
                <HubFormFieldLabel icon={Mail}>User email</HubFormFieldLabel>
                <input
                  className="field auth-gate-field w-full"
                  value={shareEmail}
                  placeholder="user@example.com"
                  onChange={(event) => setShareEmail(event.target.value)}
                />
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

      {vaultError ? (
        <p className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {vaultError}
        </p>
      ) : null}

      {viewMode === "card" ? (
          filteredRows.length === 0 ? (
            <p className="rounded-lg border border-white/5 bg-white/[.02] px-3 py-6 text-center text-[12px] text-[var(--muted)]">
              {rows.length === 0 ? "No active routes — click Add route." : "No routes match search or filters."}
            </p>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRows.map((row) => {
                const vault = row.binding.noteId ? lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain) : undefined;
                const selected = selectedBindingId === row.binding.id;
                const checked = selectedIds.includes(row.binding.id);
                return (
                  <CookieRouteCard
                    key={row.binding.id}
                    row={row}
                    vault={vault}
                    selected={selected}
                    checked={checked}
                    shareCount={shareCounts[row.binding.noteId]}
                    onOpen={() => {
                      onSelect?.(row.binding.id);
                      setModal({ type: "detail", id: row.binding.id });
                    }}
                    onSelect={() => onSelect?.(row.binding.id)}
                    onCheck={(next) => toggleSelected(row.binding.id, next)}
                  />
                );
              })}
            </div>
          )
        ) : (
      <div className="hub-users-table-wrap overflow-hidden rounded-2xl border border-white/5 bg-[var(--panel)]">
        <table className="hub-users-table hub-users-table--cookie-routes min-w-[980px]">
          <thead>
            <tr>
              <th className="hub-users-col--select w-10" scope="col">
                <input
                  type="checkbox"
                  className="hub-checkbox"
                  checked={allVisibleSelected}
                  disabled={filteredRows.length === 0}
                  title="Select all visible routes"
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                />
              </th>
              <th className="w-24" scope="col">
                <HubTableColumnHeader label="Status" icon={Activity} iconClassName="hub-users-th-icon--activity" />
              </th>
              <th className="w-20" scope="col">
                <HubTableColumnHeader label="Type" icon={Boxes} iconClassName="hub-users-th-icon--tools" />
              </th>
              <th className="w-28" scope="col">
                <HubTableColumnHeader label="Share" icon={Share2} iconClassName="hub-users-th-icon--email" />
              </th>
              <th scope="col">
                <HubTableColumnHeader label="Route" icon={Cookie} iconClassName="hub-users-th-icon--name" />
              </th>
              <th scope="col">
                <HubTableColumnHeader label="URL / ID" icon={Globe2} iconClassName="hub-users-th-icon--id" />
              </th>
              <th className="w-28" scope="col">
                <HubTableColumnHeader label="Vault" icon={Shield} iconClassName="hub-users-th-icon--role" />
              </th>
              <th className="w-32" scope="col">
                <HubTableColumnHeader label="Source" icon={LockKeyhole} iconClassName="hub-users-th-icon--created" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ binding, note, lines }) => {
              const status = note?.sync_status ?? "pending";
              const vault: CookieVaultRow | undefined = binding.noteId
                ? lookupVaultRow(vaultByKey, binding.noteId, binding.domain)
                : undefined;
              const selected = selectedBindingId === binding.id;
              const checked = selectedIds.includes(binding.id);
              const icon = siteIcon(binding.domain);
              return (
                <tr
                  key={binding.id}
                  className={`border-b border-white/5 last:border-0 hover:bg-white/[.02] ${
                    checked || selected ? "bg-cyan-500/[.06] outline outline-1 outline-cyan-400/20" : ""
                  }`}
                  onClick={() => onSelect?.(binding.id)}
                >
                  <td className="px-2 py-2 text-center align-top" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checked}
                      title="Select route"
                      onChange={(event) => toggleSelected(binding.id, event.target.checked)}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <RouteSyncChip status={status} />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <MetricBadge label={icon?.label ?? "Cookie"} tone="neutral" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <RouteShareChip binding={binding} shareCount={shareCounts[binding.noteId]} />
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
                      {lines.length ? `${lines.length} cookie line(s)` : "Awaiting snapshot"} · {note?.syncLabel ?? "not synced"}
                    </div>
                    {(() => {
                      const syncedIso = resolveRouteSyncedDisplayIso({ noteSyncedAt: note?.synced_at });
                      return syncedIso ? (
                        <div className="mt-0.5 text-[9px] text-indigo-300/70" title={syncedIso}>
                          {formatTimestampCompact(syncedIso)}
                        </div>
                      ) : null;
                    })()}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px]">
                    {vault ? (
                      <div>
                        <RouteVaultChip cookieCount={vault.cookie_count} />
                        <div className="mt-1 text-[10px] text-[var(--muted)]">
                          {formatTimestampCompactOrDash(vault.updated_at)}
                        </div>
                        {vault.updated_by ? (
                          <div className="mt-0.5 max-w-[120px] truncate text-[9px] text-amber-200/80" title={vault.updated_by}>
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
                        <div className="mt-1 max-w-[150px] truncate text-[var(--muted)]" title={binding.ownerUserId ?? undefined}>
                          Owner {ownerLabel(binding)}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[12px] text-[var(--muted)]">
                  {rows.length === 0 ? "No active routes — click Add route." : "No routes match search or filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
        )}

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

      {loading && notes.length === 0 ? (
        <p className="py-3 text-center text-[11px] text-[var(--muted)]">Loading notes…</p>
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
