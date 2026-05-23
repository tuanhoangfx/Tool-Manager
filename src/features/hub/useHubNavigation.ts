import { useCallback, useEffect, useState } from "react";
import type { AppScreen } from "../design-preview/types";
import { isAppScreen } from "../design-preview/types";

function readScreen(): AppScreen {
  if (typeof window === "undefined") return "dashboard";
  const s = new URLSearchParams(window.location.search).get("screen");
  return isAppScreen(s) ? s : "dashboard";
}

const RETIRED_SCREENS = new Set(["hub", "layouts"]);

function migrateUrl(): AppScreen {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get("screen");
  if (raw && RETIRED_SCREENS.has(raw)) {
    p.delete("tab");
    p.set("screen", "dashboard");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "dashboard";
  }
  if (p.get("legacy") === "1") {
    p.delete("legacy");
    p.delete("tab");
    p.set("screen", "library");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "library";
  }
  if (p.get("tab") === "design" && p.get("screen") && isAppScreen(p.get("screen"))) {
    p.delete("tab");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return p.get("screen") as AppScreen;
  }
  const tab = p.get("tab");
  if (tab === "library") {
    p.delete("tab");
    p.set("screen", "library");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "library";
  }
  if (tab === "activity") {
    p.delete("tab");
    p.set("screen", "activity");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "activity";
  }
  if (tab === "system") {
    p.delete("tab");
    p.set("screen", "system");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "system";
  }
  if (!p.get("screen")) {
    p.set("screen", "dashboard");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    return "dashboard";
  }
  return readScreen();
}

/** Client-side navigation — bấm tab không reload trang */
export function useHubNavigation() {
  const [screen, setScreen] = useState<AppScreen>(() => migrateUrl());

  useEffect(() => {
    document.documentElement.classList.add("p0008-hub");
    document.documentElement.classList.add("dark");
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.background = "var(--bg)";
    document.body.style.color = "var(--text)";
    return () => {
      document.documentElement.classList.remove("p0008-hub");
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const onPop = () => setScreen(readScreen());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: AppScreen, opts?: { note?: string; token?: string; replace?: boolean }) => {
    setScreen(next);
    const p = new URLSearchParams(window.location.search);
    p.delete("tab");
    p.set("screen", next);
    if (opts?.note) p.set("note", opts.note);
    else p.delete("note");
    if (opts?.token) p.set("token", opts.token);
    else if (next !== "share") p.delete("token");
    const url = `${window.location.pathname}?${p.toString()}`;
    if (opts?.replace) window.history.replaceState({ screen: next }, "", url);
    else window.history.pushState({ screen: next }, "", url);
  }, []);

  return { screen, navigate };
}
