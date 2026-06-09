import {
  configureChartLegend,
  configureFilterIcons,
  configureHubChromePrefs,
} from "@tool-workspace/hub-ui";
import { readHubListPrefs } from "./url-prefs";

let filterIconsReady: Promise<void> | null = null;

async function ensureFilterIcons() {
  if (!filterIconsReady) {
    filterIconsReady = import("./badge-registry").then(
      ({ resolveChartLegendIcon, resolveFilterAllIcon, resolveFilterOptionIcon }) => {
        configureFilterIcons({
          resolveAll: resolveFilterAllIcon,
          resolveOption: (filterKey, value) =>
            resolveFilterOptionIcon(filterKey, { value, label: value }),
        });
        configureChartLegend(resolveChartLegendIcon);
      },
    );
  }
  await filterIconsReady;
}

/** P0004 golden chrome prefs; filter icons deferred until directory tab opens. */
export function setupHubUi() {
  configureHubChromePrefs(() => ({
    headerPin: readHubListPrefs().headerPin,
    searchPin: readHubListPrefs().searchPin,
  }));
}

/** Call when opening 2FA / Cookie tabs — loads badge-registry + filter icons once. */
export function setupHubUiFilterIcons(): void {
  void ensureFilterIcons();
}
