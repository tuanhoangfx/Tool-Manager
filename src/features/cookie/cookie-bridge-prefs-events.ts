import type { CookieBridgePrefs } from "./cookieBridge";

export const COOKIE_BRIDGE_PREFS_CHANGE_EVENT = "p0020-cookie-bridge-prefs-change";

export function notifyCookieBridgePrefsChange(prefs: CookieBridgePrefs) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COOKIE_BRIDGE_PREFS_CHANGE_EVENT, { detail: prefs }));
}
