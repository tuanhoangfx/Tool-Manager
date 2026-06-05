import { HUB_TAB_LOADER_ROOT_ID } from "@tool-workspace/hub-ui";

/** Clears portaled tab orb (e.g. after StrictMode remount or stuck overlay). */
export function clearHubTabLoader() {
  document.getElementById(HUB_TAB_LOADER_ROOT_ID)?.replaceChildren();
}

/** Removes index.html boot overlay once React shell is ready. */
export function hideBootLoader() {
  document.getElementById("hub-boot-loader")?.remove();
  clearHubTabLoader();
}
