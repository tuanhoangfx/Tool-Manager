import { useCallback, useEffect, useState } from "react";
import {
  isWorkspaceScreen,
  type WorkspaceScreen,
  NAV_SCREENS,
} from "../../lib/workspace-screen";

const RETIRED = new Set([
  "dashboard",
  "library",
  "activity",
  "system",
  "settings",
  "hub",
  "layouts",
]);

function readScreen(): WorkspaceScreen {
  if (typeof window === "undefined") return "notes";
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
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "notes";
  }

  if (p.get("legacy") === "1") {
    p.delete("legacy");
    p.delete("tab");
    p.set("screen", "notes");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "notes";
  }

  if (p.get("tab") === "design" && p.get("screen") && isWorkspaceScreen(p.get("screen"))) {
    p.delete("tab");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return p.get("screen") as WorkspaceScreen;
  }

  const tab = p.get("tab");
  if (tab === "library" || tab === "activity" || tab === "system") {
    p.delete("tab");
    p.set("screen", "notes");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "notes";
  }

  if (!p.get("screen")) {
    p.set("screen", "notes");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "notes";
  }

  return readScreen();
}

/** Client-side navigation — ?screen= notes | todo | twofa | cookie | edit | share */
export function useHubNavigation() {
  const [screen, setScreen] = useState<WorkspaceScreen>(() => migrateUrl());

  useEffect(() => {
    const onPop = () => setScreen(readScreen());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback(
    (next: WorkspaceScreen, opts?: { note?: string; token?: string; replace?: boolean }) => {
      setScreen(next);
      const p = new URLSearchParams(window.location.search);
      p.delete("tab");
      p.set("screen", next);
      if (opts?.note) p.set("note", opts.note);
      else if (next !== "edit") p.delete("note");
      if (opts?.token) p.set("token", opts.token);
      else if (next !== "share") p.delete("token");
      if (next !== "cookie") p.delete("view");
      const url = `${window.location.pathname}?${p.toString()}`;
      if (opts?.replace) window.history.replaceState({ screen: next }, "", url);
      else window.history.pushState({ screen: next }, "", url);
    },
    [],
  );

  return { screen, navigate, navScreens: NAV_SCREENS };
}
