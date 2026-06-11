import type { HubViewMode } from "../../components/sales-shell";
import { patchHubListPrefs } from "../../lib/url-prefs";

/** 2FA directory view (URL `tview`). */
export function readTwofaViewMode(): HubViewMode {
  if (typeof window === "undefined") return "table";
  const raw = new URLSearchParams(window.location.search).get("tview");
  return raw === "card" ? "card" : "table";
}

export function patchTwofaViewMode(mode: HubViewMode) {
  patchHubListPrefs({ tview: mode === "table" ? null : mode });
}
