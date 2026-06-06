import type { OverviewTocItem } from "../overview/overview-toc";

export const COOKIE_ROUTE_ADD_TOC = [
  { id: "create", label: "Create route", emoji: "➕", chipClass: "border-indigo-400/30 bg-indigo-500/15" },
] as const satisfies readonly OverviewTocItem[];

export const COOKIE_ROUTE_SHARE_TOC = [
  { id: "route", label: "Route", emoji: "🍪", chipClass: "border-amber-400/30 bg-amber-500/15" },
  { id: "grant", label: "Grant access", emoji: "🛡️", chipClass: "border-emerald-400/30 bg-emerald-500/15" },
] as const satisfies readonly OverviewTocItem[];

export const COOKIE_ROUTE_EDIT_TOC = [
  { id: "route", label: "Edit route", emoji: "✏️", chipClass: "border-indigo-400/30 bg-indigo-500/15" },
] as const satisfies readonly OverviewTocItem[];

export const COOKIE_ROUTE_EDIT_MEMBER_TOC = [
  { id: "member", label: "Member access", emoji: "👤", chipClass: "border-sky-400/30 bg-sky-500/15" },
] as const satisfies readonly OverviewTocItem[];

export function cookieRouteSectionTitle(toc: readonly OverviewTocItem[], id: string): string {
  const item = toc.find((t) => t.id === id);
  return item ? `${item.emoji} ${item.label}` : id;
}
