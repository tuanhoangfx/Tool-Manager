import { Database, LayoutGrid } from "lucide-react";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import { COOKIE_HEADER_STAT_DEFS } from "./cookie-display-prefs";

export type CookieHeaderKpi = {
  routesShown: number;
  routesTotal: number;
  vaultCookies: number;
};

const STAT_DEFS = {
  "cookie-routes": {
    icon: LayoutGrid,
    label: "shown",
    toneClass: "text-indigo-300",
    pick: (k: CookieHeaderKpi) => k.routesShown,
  },
  "cookie-vault": {
    icon: Database,
    label: "vault cookies",
    toneClass: "text-amber-300",
    pick: (k: CookieHeaderKpi) => k.vaultCookies,
  },
} as const;

export function buildCookieHeaderStats(visibleKeys: Set<string>, kpi: CookieHeaderKpi): TabHeaderStatItem[] {
  return COOKIE_HEADER_STAT_DEFS.filter((h) => visibleKeys.has(h.key)).map((h) => {
    const def = STAT_DEFS[h.key as keyof typeof STAT_DEFS];
    return {
      key: h.key,
      icon: def.icon,
      label: def.label,
      value: def.pick(kpi),
      toneClass: def.toneClass,
    };
  });
}
