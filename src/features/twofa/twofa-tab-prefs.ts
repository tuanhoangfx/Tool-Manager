import {
  parseHubPrefSet,
  patchHubListPrefs,
  readHubListPrefs,
  type HubListPrefs,
} from "../../lib/url-prefs";
import { migrateChartKeysWithPersist } from "@tool-workspace/hub-ui";

export { HUB_LIST_PREFS_CHANGE_EVENT } from "../../lib/url-prefs";

/** 2FA tab KPI/charts — separate URL keys so Cookie `kpi` does not clash. */
export function readTwofaHubPrefs(): HubListPrefs {
  if (typeof window === "undefined") return readHubListPrefs();
  const hub = readHubListPrefs();
  const sp = new URLSearchParams(window.location.search);
  const charts = migrateChartKeysWithPersist(sp.get("2charts"), (value) =>
    patchHubListPrefs({ "2charts": value }),
  );
  return {
    ...hub,
    kpi: parseHubPrefSet(sp.get("2kpi")),
    charts,
  };
}

export function patchTwofaHubPrefs(patch: Record<string, string | null>) {
  const urlPatch: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "kpi") urlPatch["2kpi"] = value;
    else if (key === "charts") urlPatch["2charts"] = value;
    else urlPatch[key] = value;
  }
  patchHubListPrefs(urlPatch);
}
