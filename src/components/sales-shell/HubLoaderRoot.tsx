import { useEffect } from "react";

export const HUB_TAB_LOADER_ROOT_ID = "hub-tab-loader-root";

export function ensureHubTabLoaderRoot(): HTMLElement {
  let el = document.getElementById(HUB_TAB_LOADER_ROOT_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = HUB_TAB_LOADER_ROOT_ID;
    el.className = "pointer-events-none";
    document.body.appendChild(el);
  }
  return el;
}

/** Mounts loader portal on document.body (not inside flex main — keeps orb centered on every tab). */
export function HubLoaderRoot() {
  useEffect(() => {
    ensureHubTabLoaderRoot();
  }, []);
  return null;
}
