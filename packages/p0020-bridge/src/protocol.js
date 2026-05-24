/** Tool ↔ extension postMessage contract (keep in sync with Tool cookieBridgeProtocol.ts). */

export const BRIDGE_MSG = {
  AUTH: "P0020_COOKIE_BRIDGE_AUTH",
  BINDINGS: "P0020_COOKIE_BRIDGE_BINDINGS",
  PREFS: "P0020_COOKIE_BRIDGE_PREFS",
  SYNC: "P0020_COOKIE_BRIDGE_SYNC",
  SELECT: "P0020_COOKIE_BRIDGE_SELECT",
};

export const TOOL_ORIGINS = new Set([
  "http://127.0.0.1:5177",
  "https://tool-manager-zeta.vercel.app",
]);

export function isAllowedToolOrigin(origin) {
  return TOOL_ORIGINS.has(origin) || origin.endsWith(".vercel.app");
}

export const TOOL_COOKIE_URL_LOCAL = "http://127.0.0.1:5177/?screen=cookie";
export const TOOL_COOKIE_URL_PROD = "https://tool-manager-zeta.vercel.app/?screen=cookie";
