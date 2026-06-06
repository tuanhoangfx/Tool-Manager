import { parseHubPrefSet, patchHubListPrefs, readHubListPrefs, type HubListPrefs } from "../../lib/url-prefs";

export { HUB_LIST_PREFS_CHANGE_EVENT } from "../../lib/url-prefs";

/** Legacy chart keys → current (Cookie Auto chart redesign). */
const COOKIE_CHART_KEY_MIGRATION: Record<string, string> = {
  type_bar: "platform_bar",
  source_donut: "access_donut",
  vault_donut: "cookies_bar",
};

function migrateCookieChartKeys(set: Set<string> | null): Set<string> | null {
  if (!set) return null;
  const next = new Set<string>();
  for (const key of set) {
    next.add(COOKIE_CHART_KEY_MIGRATION[key] ?? key);
  }
  return next;
}

/** Cookie tab KPI/charts — separate URL keys from 2FA (`2kpi`) and Hub (`kpi`). */
export function readCookieHubPrefs(): HubListPrefs {
  if (typeof window === "undefined") return readHubListPrefs();
  const hub = readHubListPrefs();
  const sp = new URLSearchParams(window.location.search);
  return {
    ...hub,
    kpi: parseHubPrefSet(sp.get("ckpi")),
    charts: migrateCookieChartKeys(parseHubPrefSet(sp.get("ccharts"))),
  };
}

export function patchCookieHubPrefs(patch: Record<string, string | null>) {
  const urlPatch: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "kpi") urlPatch.ckpi = value;
    else if (key === "charts") urlPatch.ccharts = value;
    else urlPatch[key] = value;
  }
  patchHubListPrefs(urlPatch);
}
