/**
 * Single source of truth for MetricBadge label + icon + tone.
 * Hub deploy/health/category chips are canonical; System (Tool Links, Schema) must delegate here.
 */
import type { ElementType } from "react";
import { semanticFilterAllIcon } from "@tool-workspace/hub-ui";
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDownWideNarrow,
  Beaker,
  Bot,
  Calculator,
  CheckCircle2,
  Clock,
  Cloud,
  Database,
  Ellipsis,
  Eye,
  FileCode2,
  FileText,
  Flag,
  FlaskConical,
  FolderOpen,
  Fingerprint,
  Github,
  Globe2,
  HardDrive,
  Heart,
  History,
  KeyRound,
  Layers,
  LockKeyhole,
  Link2,
  Lock,
  Mail,
  Monitor,
  Package,
  Pencil,
  Pin,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Share2,
  Tag,
  Timer,
  Upload,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import type { FilterOption } from "@tool-workspace/hub-ui";
import type { LinkGroup } from "../features/overview/tool-link-filters";
import type { Mode } from "./hub-schema-spec";
import { deployLabel } from "./deploy-label";
import type { MetricBadgeTone } from "@tool-workspace/hub-ui";

export type FilterIconMeta = {
  icon: ElementType<{ size?: number; className?: string }>;
  className: string;
};

export type BadgeSpec = {
  label: string;
  iconMeta: FilterIconMeta;
  tone?: MetricBadgeTone;
  variantClass?: string;
};

function pick(map: Record<string, FilterIconMeta>, key: string): FilterIconMeta | null {
  return map[key] ?? null;
}

/** Hub — health / status filters & cards */
export const STATUS_HEALTH: Record<string, FilterIconMeta> = {
  Ready: { icon: CheckCircle2, className: "text-emerald-400" },
  "Needs review": { icon: Flag, className: "text-purple-400" },
  Active: { icon: Zap, className: "text-sky-400" },
  Beta: { icon: Beaker, className: "text-amber-400" },
  Experimental: { icon: FlaskConical, className: "text-amber-400" },
  Archived: { icon: Archive, className: "text-slate-400" },
};

/** Hub — category filter & ToolCodeBadge */
export const CATEGORY: Record<string, FilterIconMeta> = {
  Web: { icon: Monitor, className: "text-indigo-400" },
  Desktop: { icon: Monitor, className: "text-violet-400" },
  Bot: { icon: Bot, className: "text-cyan-400" },
  Infrastructure: { icon: Server, className: "text-slate-300" },
  "App Script": { icon: FileCode2, className: "text-amber-300" },
  GUI: { icon: Layers, className: "text-indigo-300" },
};

/** Hub — deploy filter & deploy QuietChip (canonical "Vercel", etc.) */
export const DEPLOY: Record<string, FilterIconMeta> = {
  Vercel: { icon: Cloud, className: "text-sky-300" },
  "GitHub Release": { icon: Package, className: "text-emerald-300" },
  "GitHub Pages": { icon: Github, className: "text-violet-300" },
  "VPS · CloudFly": { icon: Server, className: "text-orange-300" },
  "Local only": { icon: HardDrive, className: "text-slate-400" },
};

const DRIFT: Record<string, FilterIconMeta> = {
  drift: { icon: AlertTriangle, className: "text-rose-400" },
  clean: { icon: ShieldCheck, className: "text-emerald-400" },
};

const LINKS: Record<string, FilterIconMeta> = {
  missing: { icon: Link2, className: "text-amber-400" },
};

/** P0020-only filter keys — shared keys use hub-ui `filter.*` semantic registry. */
const FILTER_ALL: Record<string, FilterIconMeta> = {
  "notes-list-sort": { icon: ArrowDownWideNarrow, className: "text-sky-300" },
  "cookie-list-sort": { icon: ArrowDownWideNarrow, className: "text-sky-300" },
  "notes-autosave-delay": { icon: Timer, className: "text-emerald-300" },
  "notes-version-interval": { icon: History, className: "text-indigo-300" },
};

const COOKIE_ACCESS: Record<string, FilterIconMeta> = {
  load: { icon: UserRound, className: "text-sky-300" },
  sync: { icon: Upload, className: "text-amber-300" },
  owner: { icon: Users, className: "text-violet-300" },
};

const ROUTE_ACCESS_STATUS: Record<string, FilterIconMeta> = {
  published: { icon: CheckCircle2, className: "text-emerald-400" },
  missing: { icon: AlertTriangle, className: "text-amber-400" },
};

/** Cookie route + Notes — sync_status filter options */
const SYNC_STATUS: Record<string, FilterIconMeta> = {
  synced: { icon: CheckCircle2, className: "text-emerald-400" },
  pending: { icon: RefreshCw, className: "text-amber-400" },
  error: { icon: AlertTriangle, className: "text-rose-400" },
  manual: { icon: Pencil, className: "text-slate-400" },
};

const LINK_STATUS: Record<string, FilterIconMeta> = {
  online: { icon: CheckCircle2, className: "text-emerald-400" },
  offline: { icon: AlertTriangle, className: "text-rose-400" },
  checking: { icon: Activity, className: "text-amber-400" },
  unknown: { icon: Activity, className: "text-slate-400" },
  na: { icon: HardDrive, className: "text-slate-500" },
};

const LINK_STATUS_LABEL: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  checking: "Checking",
  unknown: "Unknown",
  na: "Not pinged",
};

const LINK_STATUS_TONE: Record<string, MetricBadgeTone> = {
  online: "ok",
  offline: "bad",
  checking: "warn",
  unknown: "neutral",
  na: "neutral",
};

/** Workspace auth session — not URL link ping (`LINK_STATUS.offline`). */
const AUTH_SESSION: Record<string, FilterIconMeta> = {
  anonymous: { icon: UserRound, className: "text-violet-400" },
  signed_in: { icon: ShieldCheck, className: "text-emerald-400" },
};

const AUTH_SESSION_LABEL: Record<string, string> = {
  anonymous: "Anonymous",
  signed_in: "Signed in",
};

const AUTH_SESSION_TONE: Record<string, MetricBadgeTone> = {
  anonymous: "warn",
  signed_in: "ok",
};

const LINK_KIND: Record<string, FilterIconMeta> = {
  url: { icon: Link2, className: "text-cyan-400" },
  id: { icon: Tag, className: "text-slate-400" },
};

const LINK_KIND_LABEL: Record<string, string> = {
  url: "URL",
  id: "ID / path",
};

export const SCHEMA_GROUP: Record<string, FilterIconMeta> = {
  Metadata: { icon: Database, className: "text-slate-300" },
  Identity: { icon: Fingerprint, className: "text-yellow-300" },
  Repository: { icon: Github, className: "text-indigo-300" },
  Classification: { icon: Layers, className: "text-emerald-300" },
  Paths: { icon: FolderOpen, className: "text-cyan-300" },
  Deploy: { icon: Rocket, className: "text-orange-300" },
  Release: { icon: Package, className: "text-amber-300" },
  URLs: { icon: Link2, className: "text-blue-300" },
  GitHub: { icon: Github, className: "text-fuchsia-300" },
  Health: { icon: Heart, className: "text-emerald-300" },
  Docs: { icon: FileText, className: "text-purple-300" },
  Runtime: { icon: Server, className: "text-rose-300" },
  "GitHub API": { icon: Github, className: "text-teal-300" },
  Sync: { icon: RefreshCw, className: "text-violet-300" },
};

export const SCHEMA_MODE: Record<Mode, FilterIconMeta> = {
  input: { icon: Pencil, className: "text-emerald-300" },
  auto: { icon: Bot, className: "text-purple-300" },
  derive: { icon: RefreshCw, className: "text-amber-300" },
  compute: { icon: Calculator, className: "text-cyan-300" },
  ro: { icon: Lock, className: "text-slate-300" },
};

export const MODE_LABEL_SHORT: Record<Mode, string> = {
  input: "Input",
  auto: "Auto",
  derive: "Derive",
  compute: "Compute",
  ro: "Read-only",
};

const FIELD_KEY: Record<string, FilterIconMeta> = {
  id: { icon: Fingerprint, className: "text-yellow-300" },
  code: { icon: Tag, className: "text-indigo-300" },
  name: { icon: FileText, className: "text-slate-200" },
  repo: { icon: Github, className: "text-violet-300" },
  branch: { icon: RefreshCw, className: "text-emerald-300" },
  category: { icon: Layers, className: "text-emerald-300" },
  status: { icon: Flag, className: "text-violet-300" },
  deployTarget: { icon: Rocket, className: "text-orange-300" },
  healthLabel: { icon: Heart, className: "text-emerald-300" },
  driftAlerts: { icon: AlertTriangle, className: "text-rose-300" },
};

const HUB_KPI: Record<string, FilterIconMeta> = {
  total: { icon: Package, className: "text-indigo-300" },
  ready: { icon: CheckCircle2, className: "text-emerald-300" },
  releases: { icon: Rocket, className: "text-amber-300" },
  drift: { icon: AlertTriangle, className: "text-rose-300" },
};

const LINK_GROUP_LABEL: Record<LinkGroup, string> = {
  web: "Web / Local",
  vercel: "Vercel",
  supabase: "Supabase",
  github: "GitHub",
  meta: "Meta / IDs",
};

function linkGroupFilterLabel(group: LinkGroup): string {
  return LINK_GROUP_LABEL[group] ?? group;
}

export function resolveFilterAllIcon(filterKey: string): FilterIconMeta | null {
  return semanticFilterAllIcon(filterKey) ?? FILTER_ALL[filterKey] ?? null;
}

export function resolveFilterOptionIcon(filterKey: string, option: FilterOption): FilterIconMeta | null {
  switch (filterKey) {
    case "folder":
      return null;
    case "service":
      return { icon: KeyRound, className: "text-amber-300" };
    case "usage":
      if (option.value === "recent") return { icon: Timer, className: "text-emerald-400" };
      if (option.value === "never") return { icon: Eye, className: "text-slate-400" };
      return null;
    case "role":
    case "permission":
    case "access":
      return pick(COOKIE_ACCESS, option.value);
    case "note":
      return { icon: FileText, className: "text-indigo-300" };
    case "notes-list-sort":
      if (option.value === "created") return { icon: Clock, className: "text-sky-300" };
      if (option.value === "title") return { icon: ArrowDownWideNarrow, className: "text-sky-300" };
      return { icon: Pencil, className: "text-sky-300" };
    case "cookie-list-sort":
      if (option.value === "created") return { icon: Clock, className: "text-sky-300" };
      if (option.value === "platform") return { icon: Globe2, className: "text-cyan-300" };
      if (option.value === "title") return { icon: ArrowDownWideNarrow, className: "text-sky-300" };
      return { icon: Pencil, className: "text-sky-300" };
    case "notes-autosave-delay":
      return { icon: Timer, className: "text-emerald-300" };
    case "notes-version-interval":
      return { icon: History, className: "text-indigo-300" };
    case "health":
    case "status":
      return (
        pick(SYNC_STATUS, option.value) ??
        pick(ROUTE_ACCESS_STATUS, option.value) ??
        pick(STATUS_HEALTH, option.label) ??
        pick(STATUS_HEALTH, option.value) ??
        LINK_STATUS[option.value] ??
        null
      );
    case "category":
      return pick(CATEGORY, option.label) ?? { icon: SCHEMA_GROUP.Classification.icon, className: "text-indigo-300/90" };
    case "deploy":
      return pick(DEPLOY, option.label) ?? { icon: DEPLOY.Vercel.icon, className: "text-sky-300/90" };
    case "drift":
      return pick(DRIFT, option.value);
    case "links":
      return pick(LINKS, option.value);
    case "pinned":
      if (option.value === "pinned") return { icon: Pin, className: "text-indigo-300" };
      if (option.value === "unpinned") return { icon: ShieldCheck, className: "text-slate-400" };
      return null;
    case "sync":
      return pick(SYNC_STATUS, option.value) ?? { icon: RefreshCw, className: "text-cyan-300" };
    case "platform":
      return option.value === "other" ? { icon: Globe2, className: "text-slate-400" } : null;
    case "share":
      return (
        {
          edit: { icon: Pencil, className: "text-violet-300" },
          view: { icon: Eye, className: "text-cyan-300" },
          private: { icon: Lock, className: "text-slate-400" },
          shared: { icon: Share2, className: "text-violet-300" },
        }[option.value] ?? { icon: Lock, className: "text-slate-400" }
      );
    case "type":
      return option.value === "facebook"
        ? { icon: Monitor, className: "text-blue-300" }
        : { icon: Layers, className: "text-slate-300" };
    case "source":
      return option.value === "locked"
        ? { icon: Lock, className: "text-emerald-300" }
        : { icon: AlertTriangle, className: "text-amber-300" };
    case "group":
      return resolveLinkGroupBadge(option.value as LinkGroup).iconMeta;
    case "kind":
      return resolveLinkKindBadge(option.value).iconMeta;
    default:
      return null;
  }
}

export function resolveHealthStatusIcon(label?: string | null): FilterIconMeta | null {
  if (!label) return null;
  return pick(STATUS_HEALTH, label);
}

export function resolveDeployTargetIcon(target?: string): FilterIconMeta {
  return resolveDeployBadge(target).iconMeta;
}

export function resolveCategoryDisplayIcon(category?: string): FilterIconMeta {
  if (!category) return { icon: CATEGORY.Web.icon, className: "text-indigo-300/90" };
  return pick(CATEGORY, category) ?? { icon: CATEGORY.Web.icon, className: "text-indigo-300/90" };
}

export function resolveDriftChipIcon(): FilterIconMeta {
  return DRIFT.drift;
}

export function resolveDriftCleanIcon(): FilterIconMeta {
  return DRIFT.clean;
}

export function resolveLinkGapChipIcon(): FilterIconMeta {
  return LINKS.missing;
}

export function resolveLocalOnlyIcon(): FilterIconMeta {
  return DEPLOY["Local only"];
}

export function resolveLocalPortIcon(online: boolean): FilterIconMeta {
  return online
    ? { icon: STATUS_HEALTH.Ready.icon, className: "text-emerald-400" }
    : DEPLOY["Local only"];
}

export function resolveSchemaGroupIcon(group: string): FilterIconMeta {
  return SCHEMA_GROUP[group] ?? { icon: SCHEMA_GROUP.Classification.icon, className: "text-slate-300" };
}

export function resolveSchemaModeIcon(mode: Mode): FilterIconMeta {
  return SCHEMA_MODE[mode];
}

export function resolveFieldSpecIcon(field: { key: string }): FilterIconMeta {
  return FIELD_KEY[field.key] ?? { icon: SCHEMA_GROUP.Metadata.icon, className: "text-slate-400" };
}

export function resolveHubKpiIcon(key: string): FilterIconMeta | null {
  return HUB_KPI[key] ?? null;
}

const CHART_SYNC_STATUS: Record<string, FilterIconMeta> = {
  Synced: { icon: CheckCircle2, className: "text-emerald-400" },
  Pending: { icon: RefreshCw, className: "text-amber-400" },
  Error: { icon: AlertTriangle, className: "text-rose-400" },
  Manual: { icon: Pencil, className: "text-slate-400" },
};

const CHART_ROUTE_ACCESS: Record<string, FilterIconMeta> = {
  Owner: { icon: ShieldCheck, className: "text-indigo-300" },
  "Locked browser": { icon: Lock, className: "text-emerald-400" },
  Member: { icon: Users, className: "text-cyan-300" },
};

const CHART_ROUTE_SHARING: Record<string, FilterIconMeta> = {
  Private: { icon: UserRound, className: "text-slate-400" },
  Shared: { icon: Users, className: "text-violet-300" },
  "Shared to me": { icon: Share2, className: "text-cyan-300" },
};

const CHART_TWOFA_USAGE: Record<string, FilterIconMeta> = {
  "Used (7d)": { icon: Timer, className: "text-emerald-400" },
  "Older use": { icon: Clock, className: "text-amber-400" },
  "Never used": { icon: Eye, className: "text-slate-400" },
};

const CHART_TWOFA_PASSWORD: Record<string, FilterIconMeta> = {
  "With password": { icon: LockKeyhole, className: "text-emerald-400" },
  "No password": { icon: KeyRound, className: "text-slate-400" },
};

const CHART_TWOFA_SERVICE: Record<string, FilterIconMeta> = {
  Imported: { icon: Upload, className: "text-cyan-300" },
};

const CHART_TWOFA_IDENTITY: Record<string, FilterIconMeta> = {
  "Email address": { icon: Mail, className: "text-cyan-300" },
  "Username / ID": { icon: UserRound, className: "text-indigo-300" },
  "Missing / generic": { icon: Ellipsis, className: "text-slate-400" },
};

const CHART_COOKIE_PLATFORM: Record<string, FilterIconMeta> = {
  Facebook: { icon: Monitor, className: "text-blue-300" },
  Google: { icon: Monitor, className: "text-sky-300" },
  YouTube: { icon: Monitor, className: "text-rose-300" },
  TikTok: { icon: Monitor, className: "text-slate-200" },
  Instagram: { icon: Monitor, className: "text-pink-300" },
  Kalodata: { icon: Database, className: "text-cyan-300" },
  Cursor: { icon: Monitor, className: "text-slate-200" },
  "BigSpy Pro": { icon: Monitor, className: "text-indigo-300" },
  Netflix: { icon: Monitor, className: "text-rose-400" },
  Surfshark: { icon: ShieldCheck, className: "text-emerald-300" },
  Others: { icon: Globe2, className: "text-slate-400" },
  Other: { icon: Globe2, className: "text-slate-400" },
};

export function resolveChartLegendIcon(label: string): FilterIconMeta | null {
  return (
    pick(CHART_TWOFA_USAGE, label) ??
    pick(CHART_TWOFA_PASSWORD, label) ??
    pick(CHART_TWOFA_IDENTITY, label) ??
    pick(CHART_TWOFA_SERVICE, label) ??
    pick(CHART_SYNC_STATUS, label) ??
    pick(CHART_ROUTE_ACCESS, label) ??
    pick(CHART_ROUTE_SHARING, label) ??
    pick(CHART_COOKIE_PLATFORM, label) ??
    pick(STATUS_HEALTH, label) ??
    pick(CATEGORY, label) ??
    pick(DEPLOY, label) ??
    null
  );
}

/** Hub deploy chip spec — reused for link group `vercel` and deployTarget fields. */
export function resolveDeployBadge(target?: string): BadgeSpec {
  const label = deployLabel(target);
  const iconMeta = pick(DEPLOY, label) ?? { icon: Rocket, className: "text-sky-300/90" };
  return { label, iconMeta, tone: "neutral" };
}

/**
 * Tool Links GROUP column — same label/icon/tone as Hub where types overlap.
 * `vercel` → Hub "Vercel" (Cloud · sky), not uppercase VERCEL / slate variant.
 */
export function resolveLinkGroupBadge(group: LinkGroup): BadgeSpec {
  const label = linkGroupFilterLabel(group);
  switch (group) {
    case "vercel":
      return resolveDeployBadge("vercel");
    case "web":
      return {
        label,
        iconMeta: pick(CATEGORY, "Web") ?? { icon: Monitor, className: "text-indigo-400" },
        tone: "neutral",
      };
    case "github":
      return {
        label,
        iconMeta: pick(DEPLOY, "GitHub Pages") ?? { icon: Github, className: "text-violet-300" },
        tone: "neutral",
      };
    case "supabase":
      return { label, iconMeta: { icon: Database, className: "text-emerald-300" }, tone: "neutral" };
    case "meta":
      return { label, iconMeta: { icon: Tag, className: "text-slate-400" }, tone: "neutral" };
    default:
      return { label, iconMeta: { icon: Tag, className: "text-slate-400" }, tone: "neutral" };
  }
}

export function resolveLinkStatusBadge(status: string): BadgeSpec {
  const label = LINK_STATUS_LABEL[status] ?? status;
  const iconMeta = LINK_STATUS[status] ?? LINK_STATUS.unknown;
  return { label, iconMeta, tone: LINK_STATUS_TONE[status] ?? "neutral" };
}

export function resolveAuthSessionBadge(mode: string): BadgeSpec {
  const label = AUTH_SESSION_LABEL[mode] ?? mode;
  const iconMeta = AUTH_SESSION[mode] ?? AUTH_SESSION.anonymous;
  return { label, iconMeta, tone: AUTH_SESSION_TONE[mode] ?? "neutral" };
}

export function resolveLinkKindBadge(kind: string): BadgeSpec {
  const label = LINK_KIND_LABEL[kind] ?? kind;
  const iconMeta = LINK_KIND[kind] ?? LINK_KIND.id;
  return { label, iconMeta, tone: "neutral" };
}

export type BadgePreviewSection = { title: string; items: BadgeSpec[] };

/** Design Template — full registry listing */
export function badgeRegistryPreviewSections(): BadgePreviewSection[] {
  return [
    {
      title: "Deploy (Hub canonical)",
      items: (["vercel", "github-pages", "github-release", "vps", "local"] as const).map((t) =>
        resolveDeployBadge(t),
      ),
    },
    {
      title: "Link groups (Tool Links)",
      items: (["web", "vercel", "supabase", "github", "meta"] as LinkGroup[]).map(resolveLinkGroupBadge),
    },
    {
      title: "Link status",
      items: Object.keys(LINK_STATUS_LABEL).map(resolveLinkStatusBadge),
    },
    {
      title: "Auth session",
      items: Object.keys(AUTH_SESSION_LABEL).map(resolveAuthSessionBadge),
    },
    {
      title: "Link kind",
      items: Object.keys(LINK_KIND_LABEL).map(resolveLinkKindBadge),
    },
    {
      title: "Health / status",
      items: Object.keys(STATUS_HEALTH).map((label) => ({
        label,
        iconMeta: STATUS_HEALTH[label],
        tone: (label === "Ready" || label === "Active" ? "ok" : "neutral") as MetricBadgeTone,
      })),
    },
    {
      title: "Category",
      items: Object.keys(CATEGORY).map((label) => ({
        label,
        iconMeta: CATEGORY[label],
        tone: "neutral" as MetricBadgeTone,
      })),
    },
    {
      title: "Schema groups",
      items: Object.keys(SCHEMA_GROUP).map((group) => ({
        label: group,
        iconMeta: SCHEMA_GROUP[group],
        tone: "neutral" as MetricBadgeTone,
      })),
    },
    {
      title: "Schema modes",
      items: (Object.keys(SCHEMA_MODE) as Mode[]).map((mode) => ({
        label: MODE_LABEL_SHORT[mode],
        iconMeta: SCHEMA_MODE[mode],
        tone: "neutral" as MetricBadgeTone,
      })),
    },
  ];
}

