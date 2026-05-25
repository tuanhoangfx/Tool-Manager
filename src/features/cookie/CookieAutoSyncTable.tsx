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
import { createPortal } from "react-dom";
import {
  Activity,
  Bot,
  Boxes,
  Clock,
  Cookie,
  Database,
  FileText,
  Info,
  LayoutGrid,
  Link2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import type { FilterDef } from "../../components/sales-shell/FilterBar";
import {
  HubResultCount,
  KpiStrip,
  MetricBadge,
  MiniBarChart,
  MiniDonut,
  ViewToggle,
  type BarItem,
  type DonutItem,
  type HubViewMode,
  type KpiTileData,
  type MetricBadgeTone,
} from "../../components/sales-shell";
import { useWorkspaceSearch } from "../workspace/WorkspaceSearchContext";
import type { NoteListItem } from "../notes/types";
import { cookieLines } from "../notes/noteUtils";
import { DOMAIN_PRESETS, type CookieBinding } from "./cookieBridge";
import type { CookieVaultRow } from "./useCookieVaultMap";
import { vaultKey } from "./useCookieVaultMap";

function formatRouteSyncTime(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatVaultTime(iso: string | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export type CookieAutoRow = {
  binding: CookieBinding;
  note: NoteListItem | undefined;
  lines: string[];
};

function buildRows(bindings: CookieBinding[], notes: NoteListItem[]): CookieAutoRow[] {
  return bindings
    .filter((b) => b.enabled)
    .map((binding) => {
      const note = notes.find((n) => n.id === binding.noteId);
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
  onSyncRoute?: (binding: CookieBinding) => void;
  onPushExtension?: () => void;
  onRefresh?: () => void;
  vaultByKey?: Record<string, CookieVaultRow>;
  vaultError?: string | null;
  toolbarActions?: ReactNode;
  renderDetail?: (binding: CookieBinding) => ReactNode;
};

type RouteModalState =
  | { type: "add" }
  | { type: "edit"; id: string }
  | { type: "delete"; ids: string[] }
  | { type: "detail"; id: string }
  | null;

const ROUTE_FILTER_DEFS: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "synced", label: "Synced" },
      { value: "pending", label: "Pending" },
      { value: "error", label: "Error" },
    ],
  },
  {
    key: "type",
    label: "Type",
    options: [
      { value: "facebook", label: "Facebook" },
      { value: "custom", label: "Custom" },
    ],
  },
  {
    key: "source",
    label: "Source",
    options: [
      { value: "locked", label: "Source locked" },
      { value: "unset", label: "No source" },
    ],
  },
];

function statusTone(status: string | undefined): MetricBadgeTone {
  if (!status || status === "pending") return "warn";
  if (/fail|error/i.test(status)) return "bad";
  return "ok";
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "";
}

function routeType(domain: string) {
  return domain.includes("facebook") ? "facebook" : "custom";
}

function routeSource(binding: CookieBinding) {
  return binding.sourceBrowserId ? "locked" : "unset";
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

function CookieDataSectionRule() {
  return (
    <div role="separator" className="relative py-5" aria-label="Cookie routes list">
      <div
        className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-indigo-400/45 to-transparent shadow-[0_0_10px_rgba(99,102,241,0.2)]"
        aria-hidden
      />
      <div className="relative flex justify-center" aria-hidden>
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-[var(--bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-300/90 shadow-[0_0_16px_rgba(99,102,241,0.12)]">
          <span className="h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
          Routes
          <span className="h-1 w-1 shrink-0 rounded-full bg-indigo-400" />
        </span>
      </div>
    </div>
  );
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
  onOpen,
  onSelect,
  onCheck,
}: {
  row: CookieAutoRow;
  vault?: CookieVaultRow;
  selected: boolean;
  checked: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onCheck: (checked: boolean) => void;
}) {
  const { binding, note, lines } = row;
  const status = note?.sync_status ?? "pending";
  const sourceLocked = Boolean(binding.sourceBrowserId);
  const dot = sourceLocked ? "#22c55e" : status === "pending" ? "#f59e0b" : "#818cf8";

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
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 text-indigo-200">
              <Cookie size={16} />
            </div>
            <span
              className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-[var(--panel)]"
              style={{ background: dot }}
              title={sourceLocked ? "Source locked" : status}
            />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="rounded border border-white/10 bg-white/[.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-indigo-200">
                {routeType(binding.domain) === "facebook" ? "FB" : "CK"}
              </span>
              <span className="min-w-0 line-clamp-2 text-sm font-medium leading-snug text-[var(--text)]">
                {binding.noteTitle ?? note?.title ?? "Untitled route"}
              </span>
            </div>
          </div>
        </div>
        <input
          type="checkbox"
          checked={checked}
          title="Select route"
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            onCheck(event.target.checked);
            onSelect();
          }}
        />
      </div>

      <div className="min-h-[7.5rem] shrink-0 space-y-1.5 text-xs text-[var(--muted)]">
        <RouteMetaRow icon={Link2} tint="#38bdf8">
          <span className="truncate font-mono text-indigo-300/90">{binding.domain}</span>
        </RouteMetaRow>
        <RouteMetaRow icon={FileText} tint="#a78bfa">
          <span className="truncate">{binding.syncId || (binding.useNoteIdRpc ? "by UUID" : binding.noteId)}</span>
        </RouteMetaRow>
        <RouteMetaRow icon={Database} tint="#34d399">
          <span className="font-medium text-[var(--text)]">
            {vault ? `${vault.cookie_count} cookies` : "No vault"}
          </span>
          {vault?.updated_at ? <span className="ml-1 text-[10px]">· {formatVaultTime(vault.updated_at)}</span> : null}
        </RouteMetaRow>
        <RouteMetaRow icon={Clock} tint="#f472b6">
          <span>{lines.length ? `${lines.length} cookie line(s)` : "Awaiting snapshot"}</span>
          {note?.syncLabel ? <span className="ml-1 text-[10px]">· {note.syncLabel}</span> : null}
        </RouteMetaRow>
      </div>

      <div className="mt-auto shrink-0 pt-3">
        <div className="flex min-h-[22px] flex-wrap items-center gap-1.5">
          <MetricBadge label={status} tone={statusTone(status)} />
          <MetricBadge label={routeType(binding.domain) === "facebook" ? "FB vault" : "Cookie"} tone="neutral" />
          <MetricBadge label={sourceLocked ? "Source locked" : "No source"} tone={sourceLocked ? "ok" : "warn"} />
          {binding.sourceBrowserId ? <MetricBadge label={shortId(binding.sourceBrowserId)} tone="neutral" mono /> : null}
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
          <span>Open details for agents</span>
          <Pencil size={14} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </button>
  );
}

function CookieRouteModal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("hub-modal-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("hub-modal-open");
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-shell w-[min(760px,94vw)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="pr-10">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Cookie route</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>,
    document.body,
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
  children,
  onMouseEnter,
}: {
  id: string;
  title: string;
  children: ReactNode;
  onMouseEnter?: () => void;
}) {
  return (
    <section id={id} className="scroll-mt-3 space-y-3" onMouseEnter={onMouseEnter}>
      <h2 className="border-b border-white/5 pb-2 text-lg font-semibold">{title}</h2>
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

function CookieRouteDetailModal({
  row,
  vault,
  renderDetail,
  onClose,
}: {
  row: CookieAutoRow;
  vault?: CookieVaultRow;
  renderDetail?: (binding: CookieBinding) => ReactNode;
  onClose: () => void;
}) {
  const { binding, note, lines } = row;
  const status = note?.sync_status ?? "pending";
  const idPrefix = `cookie-route-${binding.id}-`;
  const sectionItems = useMemo(
    () => [
      { id: `${idPrefix}about`, label: "About", icon: Info, dotClass: "bg-indigo-300", iconClass: "text-indigo-200" },
      { id: `${idPrefix}vault`, label: "Vault", icon: Database, dotClass: "bg-amber-300", iconClass: "text-amber-200" },
      { id: `${idPrefix}agents`, label: "Browser agents", icon: Bot, dotClass: "bg-emerald-300", iconClass: "text-emerald-200" },
      { id: `${idPrefix}health`, label: "Health", icon: Activity, dotClass: "bg-rose-300", iconClass: "text-rose-200" },
    ],
    [idPrefix],
  );
  const [activeSection, setActiveSection] = useState(sectionItems[0].id);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("hub-modal-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("hub-modal-open");
    };
  }, [onClose]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const sections = sectionItems
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      {
        root,
        rootMargin: "-12% 0px -62% 0px",
        threshold: [0.08, 0.2, 0.45, 0.7],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sectionItems]);

  return createPortal(
    <div className="modal-backdrop modal-backdrop--tool-detail" role="presentation" onClick={onClose}>
      <div
        className="modal-shell modal-shell--tool-detail"
        role="dialog"
        aria-modal="true"
        aria-label={`${binding.noteTitle ?? "Cookie route"} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close modal-close--tool-detail" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="modal-shell__scroll" ref={scrollRef}>
          <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-2 lg:self-start">
              <DetailNav items={sectionItems} activeId={activeSection} onActiveChange={setActiveSection} />
            </aside>

            <div className="min-w-0 space-y-5 p-1 sm:p-2">
              <div className="flex items-center gap-3 pb-1">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 text-indigo-200">
                  <Cookie size={19} />
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="rounded border border-white/10 bg-white/[.04] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-indigo-200">
                    {routeType(binding.domain) === "facebook" ? "FB" : "CK"}
                  </span>
                  <h2 className="min-w-0 truncate text-lg font-semibold leading-tight">
                    {binding.noteTitle ?? note?.title ?? "Cookie route"}
                  </h2>
                </div>
              </div>

              <DetailSection id={`${idPrefix}about`} title="About" onMouseEnter={() => setActiveSection(`${idPrefix}about`)}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-semibold">{binding.noteTitle ?? note?.title ?? "Cookie route"}</span>
                  <MetricBadge label={status} tone={statusTone(status)} />
                  <MetricBadge label={routeType(binding.domain) === "facebook" ? "Facebook" : "Cookie"} tone="neutral" />
                  <MetricBadge
                    label={binding.sourceBrowserId ? "Source locked" : "No source"}
                    tone={binding.sourceBrowserId ? "ok" : "warn"}
                  />
                </div>
                <p className="max-w-5xl rounded-xl border border-indigo-300/10 bg-indigo-500/[.045] px-4 py-3 text-[14px] leading-relaxed text-[var(--text)]/90">
                  Route này liên kết domain <code className="font-mono text-indigo-200">{binding.domain}</code> với note
                  cookie để extension có thể publish vault từ source browser và apply vault ở target browser.
                </p>
              </DetailSection>

              <DetailSection id={`${idPrefix}vault`} title="Vault" onMouseEnter={() => setActiveSection(`${idPrefix}vault`)}>
                <div className="grid gap-1.5 md:grid-cols-2">
                  <HealthRow label="domain" value={binding.domain} good />
                  <HealthRow label="sync id" value={binding.syncId || (binding.useNoteIdRpc ? "by UUID" : "—")} good />
                  <HealthRow label="vault" value={vault ? `${vault.cookie_count} cookies` : "No vault"} good={Boolean(vault)} />
                  <HealthRow label="updated" value={vault?.updated_at ? formatVaultTime(vault.updated_at) : "—"} good={Boolean(vault)} />
                  <HealthRow label="cookie lines" value={String(lines.length)} good={lines.length > 0} />
                  <HealthRow label="source" value={binding.sourceBrowserId ? shortId(binding.sourceBrowserId) : "Choose source"} good={Boolean(binding.sourceBrowserId)} />
                </div>
                {vault?.updated_by ? (
                  <p className="rounded-md border border-amber-400/20 bg-amber-500/5 px-2.5 py-1.5 text-[11px] text-amber-200">
                    Last user: <span className="font-mono">{vault.updated_by}</span>
                  </p>
                ) : null}
              </DetailSection>

              <DetailSection id={`${idPrefix}agents`} title="Browser agents" onMouseEnter={() => setActiveSection(`${idPrefix}agents`)}>
                {renderDetail ? renderDetail(binding) : <p className="text-[12px] text-[var(--muted)]">No browser agent detail.</p>}
              </DetailSection>

              <DetailSection id={`${idPrefix}health`} title="Health" onMouseEnter={() => setActiveSection(`${idPrefix}health`)}>
                <div className="grid gap-1.5 md:grid-cols-2">
                  <HealthRow label="status" value={status} good={status === "synced"} />
                  <HealthRow label="route type" value={routeType(binding.domain)} good />
                  <HealthRow label="source lock" value={binding.sourceBrowserId ? "locked" : "missing"} good={Boolean(binding.sourceBrowserId)} />
                  <HealthRow label="snapshot" value={lines.length ? "available" : "missing"} good={lines.length > 0} />
                </div>
              </DetailSection>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
  onPushExtension,
  onRefresh,
  vaultByKey = {},
  vaultError,
  toolbarActions,
  renderDetail,
}: Props) {
  const rows = buildRows(bindings, notes);
  const { query: routeQuery, filterValues, setFilters, setToolbar, setFilterToolbar } = useWorkspaceSearch();
  const [modal, setModal] = useState<RouteModalState>(null);
  const [draftNoteId, setDraftNoteId] = useState("");
  const [draftDomain, setDraftDomain] = useState(".facebook.com");
  const [draftPass, setDraftPass] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<HubViewMode>("card");

  const editing = modal?.type === "edit" ? bindings.find((b) => b.id === modal.id) : null;
  const deleting = modal?.type === "delete" ? bindings.filter((b) => modal.ids.includes(b.id)) : [];
  const detailBinding = modal?.type === "detail" ? bindings.find((b) => b.id === modal.id) : null;
  const selectedRow = useMemo(() => rows.find((row) => row.binding.id === selectedBindingId), [rows, selectedBindingId]);
  const detailRow = useMemo(
    () => (detailBinding ? rows.find((row) => row.binding.id === detailBinding.id) : null),
    [detailBinding, rows],
  );
  const filteredRows = useMemo(() => {
    const normalizedQuery = routeQuery.trim().toLowerCase();
    const activeStatuses = filterValues.status ?? [];
    const activeTypes = filterValues.type ?? [];
    const activeSources = filterValues.source ?? [];

    return rows.filter(({ binding, note }) => {
      const status = note?.sync_status ?? "pending";
      const type = routeType(binding.domain);
      const source = routeSource(binding);
      const haystack = [
        binding.domain,
        binding.syncId,
        binding.noteId,
        binding.noteTitle,
        note?.title,
        note?.syncLabel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (activeStatuses.length === 0 || activeStatuses.includes(status)) &&
        (activeTypes.length === 0 || activeTypes.includes(type)) &&
        (activeSources.length === 0 || activeSources.includes(source))
      );
    });
  }, [filterValues, routeQuery, rows]);
  const allVisibleSelected =
    filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(row.binding.id));
  const selectedBindings = useMemo(
    () => bindings.filter((binding) => selectedIds.includes(binding.id)),
    [bindings, selectedIds],
  );
  const routeKpis = useMemo<KpiTileData[]>(() => {
    const vaultRows = rows
      .map((row) => vaultByKey[vaultKey(row.binding.noteId, row.binding.domain)])
      .filter((vault): vault is CookieVaultRow => Boolean(vault));
    const cookieCount = vaultRows.reduce((sum, vault) => sum + (vault.cookie_count ?? 0), 0);
    return [
      { label: "Routes (shown)", value: filteredRows.length, hint: `${rows.length} total`, icon: LayoutGrid, tone: "indigo" },
      {
        label: "Source locked",
        value: rows.filter((row) => row.binding.sourceBrowserId).length,
        icon: LockKeyhole,
        tone: "emerald",
      },
      { label: "Vault cookies", value: cookieCount, icon: Database, tone: "amber" },
      {
        label: "Need source",
        value: rows.filter((row) => !row.binding.sourceBrowserId).length,
        icon: Shield,
        tone: "rose",
      },
    ];
  }, [filteredRows.length, rows, vaultByKey]);
  const charts = useMemo(() => {
    const statusCounts = countBy(rows.map((row) => row.note?.sync_status ?? "pending"));
    const typeCounts = countBy(rows.map((row) => routeType(row.binding.domain)));
    const sourceCounts = countBy(rows.map((row) => routeSource(row.binding)));
    const vaultCounts = countBy(
      rows.map((row) => (vaultByKey[vaultKey(row.binding.noteId, row.binding.domain)] ? "has vault" : "no vault")),
    );
    const statusItems: BarItem[] = Object.entries(statusCounts).map(([label, value], index) => ({
      label,
      value,
      color: ["#22c55e", "#f59e0b", "#f43f5e", "#818cf8"][index % 4],
    }));
    const typeItems: BarItem[] = Object.entries(typeCounts).map(([label, value], index) => ({
      label,
      value,
      color: ["#818cf8", "#06b6d4"][index % 2],
    }));
    const sourceItems: DonutItem[] = Object.entries(sourceCounts).map(([label, value], index) => ({
      label: label === "locked" ? "Source locked" : "No source",
      value,
      color: ["#22c55e", "#f59e0b"][index % 2],
    }));
    const vaultItems: DonutItem[] = Object.entries(vaultCounts).map(([label, value], index) => ({
      label,
      value,
      color: ["#818cf8", "#64748b"][index % 2],
    }));
    return { statusItems, typeItems, sourceItems, vaultItems };
  }, [rows, vaultByKey]);

  useEffect(() => {
    setFilters(ROUTE_FILTER_DEFS);
    return () => {
      setFilters([]);
      setToolbar(null);
      setFilterToolbar(null);
    };
  }, [setFilterToolbar, setFilters, setToolbar]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => bindings.some((binding) => binding.id === id)));
  }, [bindings]);

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
    onPushExtension?.();
    setModal(null);
    setDraftPass("");
  };

  const submitEdit = () => {
    if (!onUpdate || !editing) return;
    const note = notes.find((x) => x.id === draftNoteId);
    onUpdate(editing.id, {
      noteId: draftNoteId,
      syncId: note?.sync_id ?? editing.syncId,
      noteTitle: note?.title ?? editing.noteTitle,
      requiresPass: Boolean(note?.sync_pass_hash),
      domain: draftDomain.trim(),
      pass: draftPass.trim() || undefined,
      useNoteIdRpc: !note?.sync_id?.trim() && Boolean(draftNoteId),
    });
    onPushExtension?.();
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
  const deleteTargetIds = useMemo(
    () => (selectedIds.length ? selectedIds : selectedBindingId ? [selectedBindingId] : []),
    [selectedBindingId, selectedIds],
  );

  useEffect(() => {
    setToolbar(
      <>
        <ViewToggle value={viewMode} onChange={setViewMode} />
        <HubResultCount icon={Boxes} shown={filteredRows.length} total={rows.length} />
      </>,
    );
    return () => setToolbar(null);
  }, [filteredRows.length, rows.length, setToolbar, viewMode]);

  useEffect(() => {
    setFilterToolbar(
      <>
        {toolbarActions}
        {onAdd ? (
          <button
            type="button"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 text-xs font-medium text-indigo-100 hover:bg-indigo-500/30"
            onClick={openAdd}
          >
            <Plus size={12} />
            Add route
          </button>
        ) : null}
        {onUpdate ? (
          <button
            type="button"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5 disabled:opacity-50"
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
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-rose-300 hover:bg-white/5 disabled:opacity-50"
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
            className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5"
            onClick={onRefresh}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        ) : null}
      </>,
    );
    return () => setFilterToolbar(null);
  }, [
    deleteTargetIds,
    editTarget,
    onAdd,
    openAdd,
    openEdit,
    onRefresh,
    onRemove,
    onUpdate,
    selectedBindings.length,
    setFilterToolbar,
    toolbarActions,
  ]);

  return (
    <div className="relative z-0">
      {vaultError ? <p className="mb-2 text-[10px] text-amber-300/90">{vaultError}</p> : null}

      {modal?.type === "add" && onAdd ? (
        <CookieRouteModal
          title="Add route"
          subtitle="Same Hub modal pattern: choose a target note, domain, then push config to the extension."
          onClose={() => setModal(null)}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Target note</label>
              <select
                className="field mt-1 w-full text-[12px]"
                value={draftNoteId}
                onChange={(e) => setDraftNoteId(e.target.value)}
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Auto domain</label>
              <input
                className="field mt-1 font-mono text-[12px]"
                value={draftDomain}
                onChange={(e) => setDraftDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Sync pass (optional)</label>
              <input
                type="password"
                className="field mt-1 text-[12px]"
                value={draftPass}
                onChange={(e) => setDraftPass(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {DOMAIN_PRESETS.map((p) => (
              <button
                key={p.domain}
                type="button"
                className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-[var(--muted)] hover:border-emerald-400/40"
                onClick={() => setDraftDomain(p.domain)}
              >
                + {p.label}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
            <button type="button" className="btn text-[11px]" onClick={submitAdd}>
              Add & push
            </button>
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setModal(null)}>
              Cancel
            </button>
          </div>
        </CookieRouteModal>
      ) : null}

      <div className="mt-5 space-y-5">
        <KpiStrip items={routeKpis} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MiniBarChart title="By Status" items={charts.statusItems} />
          <MiniBarChart title="By Type" items={charts.typeItems} />
          <MiniDonut title="Source Distribution" items={charts.sourceItems} />
          <MiniDonut title="Vault Distribution" items={charts.vaultItems} />
        </div>
      </div>

      <CookieDataSectionRule />

      <div className="space-y-3">
        {viewMode === "card" ? (
          filteredRows.length === 0 ? (
            <p className="rounded-lg border border-white/5 bg-white/[.02] px-3 py-6 text-center text-[12px] text-[var(--muted)]">
              {rows.length === 0 ? "No active routes — click Add route." : "No routes match search or filters."}
            </p>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRows.map((row) => {
                const vault = row.binding.noteId ? vaultByKey[vaultKey(row.binding.noteId, row.binding.domain)] : undefined;
                const selected = selectedBindingId === row.binding.id;
                const checked = selectedIds.includes(row.binding.id);
                return (
                  <CookieRouteCard
                    key={row.binding.id}
                    row={row}
                    vault={vault}
                    selected={selected}
                    checked={checked}
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
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[var(--panel)]">
        <table className="w-full min-w-[980px] border-collapse text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[.02] text-[10px] uppercase tracking-wider text-[var(--muted)]">
              <th className="w-10 px-2 py-2 text-center font-medium">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  disabled={filteredRows.length === 0}
                  title="Select all visible routes"
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                />
              </th>
              <th className="w-24 px-2 py-2 font-medium">Status</th>
              <th className="w-20 px-2 py-2 font-medium">Type</th>
              <th className="w-28 px-2 py-2 font-medium">Group</th>
              <th className="px-3 py-2 font-medium">Route</th>
              <th className="px-3 py-2 font-medium">URL / ID</th>
              <th className="w-28 px-2 py-2 font-medium">
                <span className="inline-flex items-center gap-1" title="note_cookie_vault.updated_at on Supabase">
                  <Shield size={10} />
                  Vault
                </span>
              </th>
              <th className="w-32 px-2 py-2 font-medium" title="Only this browser may publish/promote vault versions">
                <span className="inline-flex items-center gap-1">
                  <LockKeyhole size={10} />
                  Source
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ binding, note, lines }) => {
              const status = note?.sync_status ?? "pending";
              const vault: CookieVaultRow | undefined = binding.noteId
                ? vaultByKey[vaultKey(binding.noteId, binding.domain)]
                : undefined;
              const selected = selectedBindingId === binding.id;
              const checked = selectedIds.includes(binding.id);
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
                    <MetricBadge label={status} tone={statusTone(status)} />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <MetricBadge label={binding.domain.includes("facebook") ? "FB vault" : "Cookie"} tone="neutral" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <MetricBadge label={binding.sourceBrowserId ? "Source locked" : "No source"} tone={binding.sourceBrowserId ? "ok" : "warn"} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 align-top">
                    <div className="font-medium text-[var(--text)]">{binding.noteTitle ?? note?.title ?? "Untitled route"}</div>
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
                    {note?.synced_at ? (
                      <div className="mt-0.5 text-[9px] text-indigo-300/70" title={note.synced_at}>
                        {formatRouteSyncTime(note.synced_at)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top text-[11px]">
                    {vault ? (
                      <div>
                        <MetricBadge label={`${vault.cookie_count} cookies`} tone="neutral" mono />
                        <div className="mt-1 text-[10px] text-[var(--muted)]">{formatVaultTime(vault.updated_at)}</div>
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
                      <MetricBadge label="Choose source" tone="warn" />
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
          vault={vaultByKey[vaultKey(detailRow.binding.noteId, detailRow.binding.domain)]}
          renderDetail={renderDetail}
          onClose={() => setModal(null)}
        />
      ) : null}

      {editing && onUpdate ? (
        <CookieRouteModal
          title="Edit route"
          subtitle="Update route metadata in a Hub-style modal. Source lock is managed in Browser agents."
          onClose={() => setModal(null)}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Note</label>
              <select
                className="field mt-1 w-full text-[12px]"
                value={draftNoteId}
                onChange={(e) => setDraftNoteId(e.target.value)}
              >
                {notes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Domain</label>
              <input
                className="field mt-1 font-mono text-[12px]"
                value={draftDomain}
                onChange={(e) => setDraftDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Sync pass</label>
              <input
                type="password"
                className="field mt-1 text-[12px]"
                placeholder={editing.requiresPass ? "Required" : "Optional"}
                value={draftPass}
                onChange={(e) => setDraftPass(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
            <button type="button" className="btn text-[11px]" onClick={submitEdit}>
              Save & push
            </button>
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setModal(null)}>
              Close
            </button>
          </div>
        </CookieRouteModal>
      ) : null}

      {loading ? (
        <p className="py-3 text-center text-[11px] text-[var(--muted)]">Loading notes…</p>
      ) : null}

      {!loading && rows.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
          <span>
            {filteredRows.length}/{rows.length} route(s) · selected route syncs in extension ·{" "}
            {filteredRows.reduce((n, r) => n + r.lines.length, 0)} cookie line(s) in visible rows
          </span>
          {selectedRow ? <span>Selected: {selectedRow.binding.domain}</span> : null}
        </div>
      ) : null}

      {deleting.length > 0 && onRemove ? (
        <CookieRouteModal
          title={deleting.length > 1 ? `Delete ${deleting.length} routes` : "Delete route"}
          subtitle="This removes local route binding(s). Existing cloud vault data is not deleted."
          onClose={() => setModal(null)}
        >
          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
            Remove{" "}
            {deleting.length === 1 ? (
              <>
                <span className="font-mono">{deleting[0].domain}</span> for{" "}
                <strong>{deleting[0].noteTitle ?? deleting[0].noteId}</strong>?
              </>
            ) : (
              <strong>{deleting.length} selected routes</strong>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button type="button" className="btn-ghost btn text-[11px] text-rose-300" onClick={submitDelete}>
              <Trash2 size={13} />
              Delete route
            </button>
          </div>
        </CookieRouteModal>
      ) : null}
      </div>
    </div>
  );
}
