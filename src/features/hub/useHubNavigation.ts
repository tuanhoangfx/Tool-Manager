import { useCallback, useEffect, useState } from "react";
import {
  isWorkspaceScreen,
  type WorkspaceScreen,
  NAV_SCREENS,
  type WorkspaceNavScreen,
} from "../../lib/workspace-screen";
import {
  buildAppUrl,
  navScreenToPath,
  pathnameToNavScreen,
  searchWithoutNavScreen,
} from "../../lib/workspace-path";

const RETIRED = new Set([
  "dashboard",
  "library",
  "activity",
  "settings",
  "hub",
  "layouts",
]);

function readScreenFromLocation(): WorkspaceScreen {
  if (typeof window === "undefined") return "notes";

  const pathScreen = pathnameToNavScreen(window.location.pathname);
  if (pathScreen) return pathScreen;

  const s = new URLSearchParams(window.location.search).get("screen");
  if (s && RETIRED.has(s)) return "notes";
  return isWorkspaceScreen(s) ? s : "notes";
}

function migrateUrl(): WorkspaceScreen {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get("screen");

  if (raw && RETIRED.has(raw)) {
    p.delete("tab");
    p.set("screen", "notes");
    window.history.replaceState(null, "", buildAppUrl("notes", p.toString()));
    return "notes";
  }

  if (p.get("legacy") === "1") {
    p.delete("legacy");
    p.delete("tab");
    p.set("screen", "notes");
    window.history.replaceState(null, "", buildAppUrl("notes", p.toString()));
    return "notes";
  }

  if (p.get("tab") === "design" && p.get("screen") && isWorkspaceScreen(p.get("screen"))) {
    p.delete("tab");
    const screen = p.get("screen") as WorkspaceScreen;
    window.history.replaceState(null, "", buildAppUrl(screen, p.toString()));
    return screen;
  }

  const tab = p.get("tab");
  if (tab === "library" || tab === "activity") {
    p.delete("tab");
    p.set("screen", "notes");
    window.history.replaceState(null, "", buildAppUrl("notes", p.toString()));
    return "notes";
  }

  const pathScreen = pathnameToNavScreen(window.location.pathname);
  if (pathScreen) {
    const clean = buildAppUrl(pathScreen, p.toString());
    if (`${window.location.pathname}${window.location.search}` !== clean) {
      window.history.replaceState(null, "", clean);
    }
    return pathScreen;
  }

  if (!p.get("screen")) {
    p.set("screen", "notes");
    window.history.replaceState(null, "", buildAppUrl("notes", p.toString()));
    return "notes";
  }

  const screen = readScreenFromLocation();
  if (NAV_SCREENS.includes(screen as WorkspaceNavScreen)) {
    window.history.replaceState(null, "", buildAppUrl(screen as WorkspaceNavScreen, p.toString()));
  }
  return screen;
}

/** Client-side navigation — path routes (/cookie) + legacy ?screen= */
export function useHubNavigation() {
  const [screen, setScreen] = useState<WorkspaceScreen>(() => migrateUrl());

  useEffect(() => {
    const onPop = () => setScreen(readScreenFromLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback(
    (next: WorkspaceScreen, opts?: { note?: string; token?: string; replace?: boolean }) => {
      setScreen(next);
      const p = new URLSearchParams(window.location.search);
      p.delete("tab");

      if (next === "share" || next === "edit") {
        p.set("screen", next);
        if (opts?.note) p.set("note", opts.note);
        else p.delete("note");
        if (opts?.token) p.set("token", opts.token);
        else p.delete("token");
        const path = `/?${p.toString()}`;
        if (opts?.replace) window.history.replaceState({ screen: next }, "", path);
        else window.history.pushState({ screen: next }, "", path);
        return;
      }

      p.delete("screen");
      if (opts?.note) p.set("note", opts.note);
      else p.delete("note");
      p.delete("token");
      if (next !== "cookie") p.delete("view");

      const qs = searchWithoutNavScreen(p.toString());
      const path = qs
        ? `${navScreenToPath(next as WorkspaceNavScreen)}?${qs}`
        : navScreenToPath(next as WorkspaceNavScreen);

      if (opts?.replace) window.history.replaceState({ screen: next }, "", path);
      else window.history.pushState({ screen: next }, "", path);
    },
    [],
  );

  return { screen, navigate, navScreens: NAV_SCREENS };
}
