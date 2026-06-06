import type { PrefItem } from "../../components/sales-shell/DisplayPrefs";
import { COOKIE_ROUTE_FILTER_DEFS } from "./cookie-route-filters";

export const COOKIE_KPI_DEFS: PrefItem[] = [
  { key: "routes_shown", label: "Routes (shown)" },
  { key: "locked_browser", label: "Locked browser" },
  { key: "vault_cookies", label: "Vault cookies" },
  { key: "owner_routes", label: "Owner routes" },
];

export const COOKIE_CHART_DEFS: PrefItem[] = [
  { key: "status_bar", label: "Sync status (bar)" },
  { key: "platform_bar", label: "Routes by platform (bar)" },
  { key: "cookies_bar", label: "Cookies stored (bar)" },
  { key: "access_donut", label: "Route access (donut)" },
  { key: "share_donut", label: "Route sharing (donut)" },
];

export const COOKIE_FILTER_DEFS: PrefItem[] = COOKIE_ROUTE_FILTER_DEFS.map(({ key, label }) => ({
  key,
  label,
}));

export const COOKIE_HEADER_STAT_DEFS: PrefItem[] = [
  { key: "cookie-routes", label: "Routes" },
  { key: "cookie-vault", label: "Vault cookies" },
];

export const DEFAULT_COOKIE_KPI_KEYS = new Set(COOKIE_KPI_DEFS.map((k) => k.key));
export const DEFAULT_COOKIE_CHART_KEYS = new Set(COOKIE_CHART_DEFS.map((c) => c.key));
export const DEFAULT_COOKIE_HEADER_STAT_KEYS = new Set(COOKIE_HEADER_STAT_DEFS.map((s) => s.key));
