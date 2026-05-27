/** Shim for P0004 sales-shell copies (DisplayPrefs / legacy Sidebar). P0020 uses workspace-screen. */
export type AppScreen = "library" | "system";

export function readAppScreen(): AppScreen {
  if (typeof window === "undefined") return "library";
  const s = new URLSearchParams(window.location.search).get("screen");
  return s === "system" ? "system" : "library";
}

export function setAppScreen(_screen: AppScreen) {
  /* no-op — P0020 navigation uses useHubNavigation */
}
