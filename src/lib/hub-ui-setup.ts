import {
  configureChartLegend,
  configureFilterIcons,
  configureHubChromePrefs,
} from "@tool-workspace/hub-ui";
import {
  resolveChartLegendIcon,
  resolveFilterAllIcon,
  resolveFilterOptionIcon,
} from "./badge-registry";
import { readHubListPrefs } from "./url-prefs";

/** P0004 golden — chrome prefs + workspace filter/chart icons at boot (all tabs). */
export function setupHubUi() {
  configureHubChromePrefs(() => ({
    headerPin: readHubListPrefs().headerPin,
    searchPin: readHubListPrefs().searchPin,
  }));

  configureFilterIcons({
    resolveAll: resolveFilterAllIcon,
    resolveOption: (filterKey, value) =>
      resolveFilterOptionIcon(filterKey, { value, label: value }),
  });

  configureChartLegend(resolveChartLegendIcon);
}

/** @deprecated Icons load at boot via setupHubUi — kept for lazy-import callers. */
export function setupHubUiFilterIcons(): void {
  /* no-op */
}
