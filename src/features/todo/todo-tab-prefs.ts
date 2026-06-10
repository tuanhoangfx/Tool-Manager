import { migrateChartKeysWithPersist } from "@tool-workspace/hub-ui";
import { parseHubPrefSet, patchHubListPrefs, readHubListPrefs, type HubListPrefs } from "../../lib/url-prefs";

export { HUB_LIST_PREFS_CHANGE_EVENT } from "../../lib/url-prefs";

/** Todo tab KPI/charts — URL keys `tkpi` / `tcharts`. */
export function readTodoHubPrefs(): HubListPrefs {
  if (typeof window === "undefined") return readHubListPrefs();
  const hub = readHubListPrefs();
  const sp = new URLSearchParams(window.location.search);
  const charts = migrateChartKeysWithPersist(sp.get("tcharts"), (value) =>
    patchHubListPrefs({ tcharts: value }),
  );
  return {
    ...hub,
    kpi: parseHubPrefSet(sp.get("tkpi")),
    charts,
  };
}

export function patchTodoHubPrefs(patch: Record<string, string | null>) {
  const urlPatch: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === "kpi") urlPatch.tkpi = value;
    else if (key === "charts") urlPatch.tcharts = value;
    else urlPatch[key] = value;
  }
  patchHubListPrefs(urlPatch);
}
