import { configureFilterIcons, configureHubChromePrefs } from "@tool-workspace/hub-ui";
import { resolveFilterAllIcon, resolveFilterOptionIcon } from "./badge-registry";
import { readHubListPrefs } from "./url-prefs";

/** P0004 golden chrome prefs + filter icon registry (FilterBar / HubSingleFilterDropdown). */
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
}
