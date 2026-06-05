import { parseHubPrefSet, patchHubListPrefs, readHubListPrefs, type HubListPrefs } from "../../lib/url-prefs";

export { HUB_LIST_PREFS_CHANGE_EVENT } from "../../lib/url-prefs";

/** Cookie tab KPI/charts — separate URL keys from 2FA (`2kpi`) and Hub (`kpi`). */
export function readCookieHubPrefs(): HubListPrefs {
  if (typeof window === "undefined") return readHubListPrefs();
  const hub = readHubListPrefs();
  const sp = new URLSearchParams(window.location.search);
  return {
    ...hub,
    kpi: parseHubPrefSet(sp.get("ckpi")),
    charts: parseHubPrefSet(sp.get("ccharts")),
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
