import type { PrefItem } from "../../components/sales-shell/DisplayPrefs";
import { defaultChartKeysFromDefs, defaultKpiKeysFromDefs } from "@tool-workspace/hub-ui";
import { COOKIE_ROUTE_FILTER_DEFS } from "./cookie-route-filters";

export const COOKIE_KPI_DEFS: PrefItem[] = [
  { key: "routes_shown", label: "Routes (shown)" },
  { key: "locked_browser", label: "Locked browser" },
  { key: "owner_routes", label: "Owner routes" },
];

export const COOKIE_CHART_DEFS: PrefItem[] = [
  { key: "status_bar", label: "Sync status (bar)" },
  { key: "platform_bar", label: "Routes by platform (bar)" },
  { key: "share_bar", label: "Route share (bar)" },
];

/** Retired chart keys → share_bar (cookies/access/vault donuts removed). */
export const COOKIE_CHART_KEY_MIGRATION: Record<string, string> = {
  cookies_bar: "share_bar",
  access_bar: "share_bar",
  vault_donut: "share_bar",
  access_donut: "share_bar",
  share_donut: "share_bar",
};

export const COOKIE_FILTER_DEFS: PrefItem[] = COOKIE_ROUTE_FILTER_DEFS.map(({ key, label }) => ({
  key,
  label,
}));

export const COOKIE_HEADER_STAT_DEFS: PrefItem[] = [
  { key: "cookie-routes", label: "Routes" },
  { key: "cookie-vault", label: "Vault cookies" },
];

export const DEFAULT_COOKIE_KPI_KEYS = defaultKpiKeysFromDefs(COOKIE_KPI_DEFS);
export const DEFAULT_COOKIE_CHART_KEYS = defaultChartKeysFromDefs(COOKIE_CHART_DEFS);
export const DEFAULT_COOKIE_HEADER_STAT_KEYS = new Set(COOKIE_HEADER_STAT_DEFS.map((s) => s.key));
export { DEFAULT_COOKIE_ROUTE_FILTER_KEYS } from "./cookie-route-filters";
