import { configureHubChromePrefs } from "@tool-workspace/hub-ui";
import { readHubListPrefs } from "./url-prefs";

/** P0004 golden chrome prefs (header/search sticky pins from URL). */
export function setupHubUi() {
  configureHubChromePrefs(() => ({
    headerPin: readHubListPrefs().headerPin,
    searchPin: readHubListPrefs().searchPin,
  }));
}
