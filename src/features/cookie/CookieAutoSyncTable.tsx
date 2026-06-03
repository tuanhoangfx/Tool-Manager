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
  Check,
  Cookie,
  Copy,
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
  UserPlus,
  X,
} from "lucide-react";
import {
  HubResultCount,
  HubTimeRangeSelect,
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
import { routeMatchesTimeRange } from "./cookie-route-activity";
import { fetchNoteCookieSnapshot } from "../notes/notesRepository";
import { cookieLines } from "../notes/noteUtils";
import { DOMAIN_PRESETS, normalizeCookieDomain, type CookieBinding } from "./cookieBridge";
import { readCookieDeepLink } from "./cookieDeepLink";
import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import { buildAppUrl } from "../../lib/workspace-path";
import { readHubListPrefs } from "../../lib/url-prefs";
import { COOKIE_ROUTE_FILTER_DEFS } from "./cookie-route-filters";
import { DEFAULT_COOKIE_CHART_KEYS, DEFAULT_COOKIE_KPI_KEYS } from "./cookie-display-prefs";

function visibleSet(set: Set<string> | null, defaults: Set<string>) {
  return set ?? defaults;
}
import { listNoteCookieMembers, upsertNoteCookieMember } from "./noteCookieMembersRepository";
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
  onJoinByNoteId?: (noteId: string, domain: string) => Promise<boolean> | boolean;
  onUpdate?: (id: string, patch: Partial<CookieBinding>) => void;
  onRemove?: (id: string) => void;
  onSyncRoute?: (binding: CookieBinding) => void;
  onRefresh?: () => void;
  vaultByKey?: Record<string, CookieVaultRow>;
  vaultError?: string | null;
  toolbarActions?: ReactNode;
  toolbarActionsKey?: string;
  renderDetail?: (binding: CookieBinding) => ReactNode;
  renderAccessDetail?: (binding: CookieBinding) => ReactNode;
  renderAgentDetail?: (binding: CookieBinding) => ReactNode;
};

type RouteModalState =
  | { type: "add" }
  | { type: "edit"; id: string }
  | { type: "delete"; ids: string[] }
  | { type: "detail"; id: string }
  | { type: "share"; id: string }
  | null;

type AddRouteMode = "create" | "join";
type ShareRole = "load" | "sync" | "manager";

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

function routeType(domain: string) {
  return domain.includes("facebook") ? "facebook" : "custom";
}

function routeSource(binding: CookieBinding) {
  return binding.sourceBrowserId ? "locked" : "unset";
}

function siteIcon(domain: string) {
  return resolveCookieSiteIcon(domain);
}

function shareStateLabel(binding: CookieBinding, shareCount: number | undefined) {
  if (binding.accessRole === "member") return "Shared to me";
  return shareCount && shareCount > 0 ? `Shared ${shareCount}` : "Private";
}

function shareStateTone(binding: CookieBinding, shareCount: number | undefined): MetricBadgeTone {
  if (binding.accessRole === "member") return "neutral";
  return shareCount && shareCount > 0 ? "ok" : "neutral";
}

function sharePermissions(role: ShareRole) {
  return {
    canApply: true,
    canPublish: role === "sync" || role === "manager",
    canManage: role === "manager",
  };
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
  const sourceLocked = Boolean(binding.sourceBrowserId);
  const dot = sourceLocked ? "#22c55e" : status === "pending" ? "#f59e0b" : "#818cf8";
  const icon = siteIcon(binding.domain);
  const shareLabel = shareStateLabel(binding, shareCount);

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
          {vault?.updated_at ? <span className="ml-1 text-[10px]">· {formatVaultTime(vault.updated_at)}</span> : null}
        </RouteMetaRow>
      </div>

      <div className="mt-auto shrink-0 pt-3">
        <div className="flex min-h-[22px] flex-wrap items-center gap-1.5">
          <MetricBadge label={status} tone={statusTone(status)} />
          <MetricBadge label={vault ? `${vault.cookie_count} cookies` : "No vault"} tone={vault ? "neutral" : "warn"} />
          <MetricBadge label={shareLabel} tone={shareStateTone(binding, shareCount)} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--muted)]">
          <span>Open access detail</span>
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
        className="modal-shell modal-shell--form"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
        <div className="flex items-start gap-3 pr-10">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-indigo-400/20 bg-indigo-500/15 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.12)]">
            <Cookie size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">Cookie route</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-3xl text-xs leading-relaxed text-[var(--muted)]">{subtitle}</p> : null}
          </div>
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
  renderAgentDetail,
  onClose,
}: {
  row: CookieAutoRow;
  vault?: CookieVaultRow;
  renderDetail?: (binding: CookieBinding) => ReactNode;
  renderAccessDetail?: (binding: CookieBinding) => ReactNode;
  renderAgentDetail?: (binding: CookieBinding) => ReactNode;
  onClose: () => void;
}) {
  const { binding, note, lines } = row;
  const status = note?.sync_status ?? "pending";
  const idPrefix = `cookie-route-${binding.id}-`;
  const [snapshotLines, setSnapshotLines] = useState(lines);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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
    () => [
      { id: `${idPrefix}about`, label: "About", icon: Info, tone: "indigo" },
      { id: `${idPrefix}vault`, label: "Vault", icon: Database, tone: "amber" },
      { id: `${idPrefix}access`, label: "Access", icon: Shield, tone: "emerald" },
      ...(showDiagnostics ? [{ id: `${idPrefix}agents`, label: "Agents", icon: Bot, tone: "cyan" }] : []),
      { id: `${idPrefix}health`, label: "Health", icon: Activity, tone: "rose" },
    ],
    [idPrefix, showDiagnostics],
  );
  const [activeSection, setActiveSection] = useState(sectionItems[0].id);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
          <div className="route-detail-preview route-detail-preview--classic">
            <aside className="rdp-toc" aria-label="Route detail sections">
              <div className="rdp-toc-title">Route detail</div>
              {sectionItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={activeSection === item.id ? "rdp-toc-item is-active" : "rdp-toc-item"}
                    onClick={() => setActiveSection(item.id)}
                  >
                    <span className={`rdp-toc-chip rdp-${item.tone}`}>
                      <Icon size={12} />
                    </span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </aside>
            <main className="rdp-content">
              <div className="rdp-hero">
                <div>
                  <p className="rdp-kicker">Route detail</p>
                  <h3>{binding.noteTitle ?? note?.title ?? "Cookie route"}</h3>
                  <p>Cookie vault, access, and browser status for this route.</p>
                </div>
                <div className="rdp-route-card">
                  <span>{binding.domain}</span>
                  <strong>{binding.syncId || shortId(binding.noteId)}</strong>
                </div>
              </div>

              <div className="rdp-context-grid">
                <section
                  id={`${idPrefix}about`}
                  className="rdp-section"
                  onMouseEnter={() => setActiveSection(`${idPrefix}about`)}
                >
                  <div className="rdp-section-head">
                    <div>
                      <h4>About</h4>
                      <span>Route identity, operating mode, and permission context</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{binding.noteTitle ?? note?.title ?? "Cookie route"}</span>
                    <MetricBadge label={status} tone={statusTone(status)} />
                  </div>
                  <div className="rdp-info-grid">
                    <div>
                      <span>Domain</span>
                      <strong>{binding.domain}</strong>
                    </div>
                    <div>
                      <span>Sync ID</span>
                      <div className="rdp-info-value">
                        <strong>{binding.syncId || (binding.useNoteIdRpc ? "by UUID" : "Missing")}</strong>
                        {binding.syncId ? (
                          <button type="button" className="rdp-copy" onClick={() => void copyValue("sync", binding.syncId)} title="Copy Sync ID">
                            <Copy size={11} />
                            {copiedField === "sync" ? "Copied" : "Copy"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <span>Note ID</span>
                      <div className="rdp-info-value">
                        <strong>{binding.noteId || "Missing"}</strong>
                        {binding.noteId ? (
                          <button type="button" className="rdp-copy" onClick={() => void copyValue("note", binding.noteId)} title="Copy Note ID">
                            <Copy size={11} />
                            {copiedField === "note" ? "Copied" : "Copy"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <span>Access role</span>
                      <strong>{binding.accessRole ?? "owner"}</strong>
                    </div>
                    <div>
                      <span>Owner user</span>
                      <strong title={binding.ownerUserId ?? undefined}>{ownerLabel(binding)}</strong>
                    </div>
                  </div>
                </section>

                <section
                  id={`${idPrefix}vault`}
                  className="rdp-section"
                  onMouseEnter={() => setActiveSection(`${idPrefix}vault`)}
                >
                  <div className="rdp-section-head">
                    <div>
                      <h4>Cloud vault</h4>
                      <span>Cookie data used by Load cookies, plus the Note snapshot for reference</span>
                    </div>
                  </div>
                  <div className="rdp-info-grid">
                    <div>
                      <span>Cloud vault</span>
                      <strong>{vault ? `${vault.cookie_count} cookies` : "No vault"}</strong>
                    </div>
                    <div>
                      <span>Updated</span>
                      <strong>{vault?.updated_at ? formatVaultTime(vault.updated_at) : "Missing"}</strong>
                    </div>
                    <div>
                      <span>Note snapshot</span>
                      <strong>{snapshotLines.length ? `${snapshotLines.length} line(s)` : "Missing"}</strong>
                    </div>
                    <div>
                      <span>Publish browser</span>
                      <div className="rdp-info-value">
                        <strong>{binding.sourceBrowserId ? shortId(binding.sourceBrowserId) : "Owner"}</strong>
                        {binding.sourceBrowserId ? (
                          <button type="button" className="rdp-copy" onClick={() => void copyValue("source", binding.sourceBrowserId)} title="Copy Source ID">
                            <Copy size={11} />
                            {copiedField === "source" ? "Copied" : "Copy"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <span>Source label</span>
                      <strong>{binding.sourceLabel || "Not set"}</strong>
                    </div>
                    <div>
                      <span>Last user</span>
                      <strong>{vault?.updated_by || "Unknown"}</strong>
                    </div>
                  </div>
                </section>
              </div>

              <div id={`${idPrefix}access`} onMouseEnter={() => setActiveSection(`${idPrefix}access`)}>
                {renderAccessDetail ? renderAccessDetail(binding) : renderDetail ? renderDetail(binding) : <p className="text-[12px] text-[var(--muted)]">No access detail.</p>}
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[.018] p-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 py-2 text-xs text-[var(--text)] hover:bg-white/5"
                  onClick={() => {
                    const next = !showDiagnostics;
                    setShowDiagnostics(next);
                    if (next) window.setTimeout(() => setActiveSection(`${idPrefix}agents`), 0);
                  }}
                >
                  <Bot size={13} className="text-cyan-300" />
                  {showDiagnostics ? "Hide advanced diagnostics" : "Advanced diagnostics"}
                </button>
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  Browser agents are only needed when debugging multi-profile sync, realtime, or command delivery.
                </p>
              </div>

              {showDiagnostics ? (
                <div id={`${idPrefix}agents`} onMouseEnter={() => setActiveSection(`${idPrefix}agents`)}>
                  {renderAgentDetail ? renderAgentDetail(binding) : <p className="text-[12px] text-[var(--muted)]">No browser agent detail.</p>}
                </div>
              ) : null}

              <section
                id={`${idPrefix}health`}
                className="rdp-health-grid"
                onMouseEnter={() => setActiveSection(`${idPrefix}health`)}
              >
                <div>
                  <span>Route published</span>
                  <strong>{status === "synced" ? "OK" : status}</strong>
                </div>
                <div>
                  <span>Vault fetch v3</span>
                  <strong>{vault ? "OK" : "Missing"}</strong>
                </div>
                <div>
                  <span>Publish browser</span>
                  <strong>{binding.sourceBrowserId ? shortId(binding.sourceBrowserId) : "Owner"}</strong>
                </div>
                <div>
                  <span>Employee apply</span>
                  <strong>{binding.canApply === false ? "Blocked" : "Ready"}</strong>
                </div>
              </section>
            </main>
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
  onJoinByNoteId,
  onUpdate,
  onRemove,
  onRefresh,
  vaultByKey = {},
  vaultError,
  toolbarActions,
  toolbarActionsKey = "",
  renderDetail,
  renderAccessDetail,
  renderAgentDetail,
}: Props) {
  const notesById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes]);
  const rows = useMemo(() => buildRows(bindings, notesById), [bindings, notesById]);
  const { query: routeQuery, filterValues, setFilters, setToolbar, setFilterToolbar } = useWorkspaceSearch();
  const [prefs, setPrefs] = useState(readHubListPrefs);
  const visKpi = visibleSet(prefs.kpi, DEFAULT_COOKIE_KPI_KEYS);
  const visCharts = visibleSet(prefs.charts, DEFAULT_COOKIE_CHART_KEYS);
  const [modal, setModal] = useState<RouteModalState>(null);
  const [draftNoteId, setDraftNoteId] = useState("");
  const [draftDomain, setDraftDomain] = useState(".facebook.com");
  const [draftPass, setDraftPass] = useState("");
  const [addMode, setAddMode] = useState<AddRouteMode>("create");
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("load");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
  const [joinBusy, setJoinBusy] = useState(false);
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
        (activeSources.length === 0 || activeSources.includes(source)) &&
        routeMatchesTimeRange(binding, note, prefs.range)
      );
    });
  }, [filterValues, prefs.range, routeQuery, rows]);
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
        value: rows.filter((row) => row.binding.sourceBrowserId).length,
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
        value: rows.filter((row) => !row.binding.sourceBrowserId).length,
        icon: Shield,
        tone: "emerald",
      },
    ];
    return all.filter((item) => item.prefKey && visKpi.has(item.prefKey));
  }, [filteredRows.length, rows, vaultByKey, visKpi]);
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
      label: label === "locked" ? "Locked browser" : "Owner route",
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
    const sync = () => setPrefs(readHubListPrefs());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    setFilters(COOKIE_ROUTE_FILTER_DEFS);
    return () => {
      toolbarKeyRef.current = "";
      filterToolbarKeyRef.current = "";
      setFilters([]);
      setToolbar(null);
      setFilterToolbar(null);
    };
  }, [setFilterToolbar, setFilters, setToolbar]);

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
    setAddMode("create");
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

  const submitJoin = async () => {
    if (!onJoinByNoteId || !draftNoteId.trim() || joinBusy) return;
    setJoinBusy(true);
    try {
      const ok = await onJoinByNoteId(draftNoteId.trim(), draftDomain.trim());
      if (ok) {
        setModal(null);
        setDraftNoteId("");
      }
    } finally {
      setJoinBusy(false);
    }
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
    onJoinByNoteId ? "join" : "",
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
          {onAdd || onJoinByNoteId ? (
            <button
              type="button"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 text-xs font-medium text-indigo-100 hover:bg-indigo-500/30"
            onClick={openAdd}
            >
              <Plus size={12} />
              Add route
            </button>
          ) : null}
        {shareTarget ? (
          <button
            type="button"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
            disabled={!canShareTarget}
            title={canShareTarget ? "Share selected route" : "Only route owner/manager can share"}
            onClick={() => canShareTarget && shareTarget && openShare(shareTarget)}
          >
            <UserPlus size={12} />
            Share user
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
  }, [
    deleteTargetIds,
    editTarget,
    filterToolbarKey,
    canShareTarget,
    onAdd,
    onJoinByNoteId,
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
    <div className="relative z-0">
      {vaultError ? <p className="mb-2 text-[10px] text-amber-300/90">{vaultError}</p> : null}

      {modal?.type === "add" && (onAdd || onJoinByNoteId) ? (
        <CookieRouteModal
          title="Add route"
          subtitle="Create a cloud route or join a route shared by Note ID."
          onClose={() => setModal(null)}
        >
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${addMode === "create" ? "bg-indigo-500/25 text-indigo-100" : "text-[var(--muted)] hover:bg-white/5"}`}
              onClick={() => setAddMode("create")}
            >
              Create route
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${addMode === "join" ? "bg-sky-500/25 text-sky-100" : "text-[var(--muted)] hover:bg-white/5"}`}
              onClick={() => setAddMode("join")}
            >
              Add by Note ID
            </button>
          </div>
          {addMode === "create" ? (
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
          ) : (
            <>
              <div className="rounded-xl border border-sky-400/15 bg-sky-500/[.06] px-3 py-2 text-[12px] leading-relaxed text-sky-100/90">
                Paste the Note ID shared by owner. Supabase checks <code className="font-mono">note_cookie_members</code> before returning routes.
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Shared Note ID</label>
                  <input
                    className="field mt-1 font-mono text-[12px]"
                    value={draftNoteId}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    onChange={(e) => setDraftNoteId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Domain</label>
                  <input
                    className="field mt-1 font-mono text-[12px]"
                    value={draftDomain}
                    onChange={(e) => setDraftDomain(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
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
            <button
              type="button"
              className="btn text-[11px]"
              disabled={addMode === "join" ? !draftNoteId.trim() || joinBusy : !draftNoteId.trim()}
              onClick={() => {
                if (addMode === "join") void submitJoin();
                else submitAdd();
              }}
            >
              {addMode === "join" ? (joinBusy ? "Joining..." : "Join shared route") : "Create cloud route"}
            </button>
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setModal(null)}>
              Cancel
            </button>
          </div>
        </CookieRouteModal>
      ) : null}

      {modal?.type === "share" && shareBinding ? (
        <CookieRouteModal
          title="Share user"
          subtitle="Grant another user access to this route by email. The recipient can add it by Note ID or refresh accessible routes."
          onClose={() => setModal(null)}
        >
          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/[.06] p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-emerald-100">{shareBinding.noteTitle ?? "Cookie route"}</p>
                <p className="font-mono text-[10px] text-emerald-100/65">{shareBinding.noteId}</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-emerald-300/25 px-2 py-1 text-[10px] text-emerald-100 hover:bg-emerald-500/10"
                onClick={() => void navigator.clipboard?.writeText(shareBinding.noteId)}
              >
                Copy Note ID
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_150px]">
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">User email</label>
                <input
                  className="field mt-1 text-[12px]"
                  value={shareEmail}
                  placeholder="user@example.com"
                  onChange={(event) => setShareEmail(event.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Permission</label>
                <select
                  className="field mt-1 text-[12px]"
                  value={shareRole}
                  onChange={(event) => setShareRole(event.target.value as ShareRole)}
                >
                  <option value="load">Load only</option>
                  <option value="sync">Can sync</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
            <button type="button" className="btn text-[11px]" disabled={!shareEmail.trim() || shareBusy} onClick={() => void submitShare()}>
              {shareBusy ? "Sharing..." : "Share route"}
            </button>
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setModal(null)}>
              Cancel
            </button>
          </div>
        </CookieRouteModal>
      ) : null}

      {routeKpis.length > 0 ||
      visCharts.has("status_bar") ||
      visCharts.has("type_bar") ||
      visCharts.has("source_donut") ||
      visCharts.has("vault_donut") ? (
        <div className="mt-5 space-y-5">
          {routeKpis.length > 0 ? <KpiStrip items={routeKpis} /> : null}
          {visCharts.has("status_bar") ||
          visCharts.has("type_bar") ||
          visCharts.has("source_donut") ||
          visCharts.has("vault_donut") ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {visCharts.has("status_bar") ? (
                <MiniBarChart title="By Status" items={charts.statusItems} />
              ) : null}
              {visCharts.has("type_bar") ? <MiniBarChart title="By Type" items={charts.typeItems} /> : null}
              {visCharts.has("source_donut") ? (
                <MiniDonut title="Publish Mode" items={charts.sourceItems} />
              ) : null}
              {visCharts.has("vault_donut") ? (
                <MiniDonut title="Vault Distribution" items={charts.vaultItems} />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

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
                    <MetricBadge label={status} tone={statusTone(status)} />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <MetricBadge label={icon?.label ?? "Cookie"} tone="neutral" />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <MetricBadge label={binding.sourceBrowserId ? "Locked" : "Owner"} tone="ok" />
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
          vault={vaultByKey[vaultKey(detailRow.binding.noteId, detailRow.binding.domain)]}
          renderDetail={renderDetail}
          renderAccessDetail={renderAccessDetail}
          renderAgentDetail={renderAgentDetail}
          onClose={() => setModal(null)}
        />
      ) : null}

      {editing && onUpdate ? (
        <CookieRouteModal
          title="Edit route"
          subtitle="Update route metadata. Advanced diagnostics are available in route detail when needed."
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
              Save cloud route
            </button>
            <button type="button" className="btn-ghost btn text-[11px]" onClick={() => setModal(null)}>
              Close
            </button>
          </div>
        </CookieRouteModal>
      ) : null}

      {loading && notes.length === 0 ? (
        <p className="py-3 text-center text-[11px] text-[var(--muted)]">Loading notes…</p>
      ) : null}

      {deleting.length > 0 && onRemove ? (
        <CookieRouteModal
          title={deleting.length > 1 ? `Delete ${deleting.length} routes` : "Delete route"}
          subtitle="This disables the cloud route so linked browsers remove it on the next realtime refresh. Existing vault data is not deleted."
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
