import type { OverviewTocItem } from "../overview/overview-toc";

export const COOKIE_ROUTE_DETAIL_TOC = [
  { id: "about", label: "About", emoji: "ℹ️", chipClass: "border-indigo-400/30 bg-indigo-500/15" },
  { id: "access", label: "Access", emoji: "🛡️", chipClass: "border-emerald-400/30 bg-emerald-500/15" },
] as const satisfies readonly OverviewTocItem[];

export function cookieRouteDetailSectionTitle(id: (typeof COOKIE_ROUTE_DETAIL_TOC)[number]["id"]): string {
  const item = COOKIE_ROUTE_DETAIL_TOC.find((t) => t.id === id);
  return item ? `${item.emoji} ${item.label}` : id;
}
