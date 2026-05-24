import { useCallback, useEffect, useState } from "react";
import type { AppScreen } from "../features/design-preview/types";
import { isAppScreen } from "../features/design-preview/types";

const DEFAULT_SCREEN: AppScreen = "notes";

const RETIRED_SCREENS = new Set(["dashboard", "library", "hub", "layouts", "activity", "settings"]);

function readScreen(): AppScreen {
  if (typeof window === "undefined") return DEFAULT_SCREEN;
  const s = new URLSearchParams(window.location.search).get("screen");
  if (s === "edit") return "notes";
  if (s && RETIRED_SCREENS.has(s)) return DEFAULT_SCREEN;
  return isAppScreen(s) ? s : DEFAULT_SCREEN;
}

function migrateUrl(): AppScreen {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get("screen");
  let next = readScreen();

  if (raw === "activity" || raw === "hub") {
    p.delete("tab");
    p.set("screen", "system");
    if (!p.get("stab")) p.set("stab", "overview");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    next = "system";
  } else if (raw === "settings") {
    p.set("screen", "notes");
    p.set("view", "settings");
    p.delete("tab");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    next = "notes";
  } else if (raw && RETIRED_SCREENS.has(raw)) {
    p.delete("tab");
    p.delete("stab");
    p.delete("dtpl");
    p.delete("ndesign");
    p.delete("nround");
    p.delete("view");
    p.set("screen", DEFAULT_SCREEN);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    next = DEFAULT_SCREEN;
  } else if (!p.get("screen")) {
    p.set("screen", DEFAULT_SCREEN);
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
    next = DEFAULT_SCREEN;
  } else if (p.get("tab")) {
    p.delete("tab");
    window.history.replaceState(null, "", `${window.location.pathname}?${p.toString()}`);
  }

  return next;
}

/** Client-side navigation — bấm tab không reload trang */
export function useAppNavigation() {
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
    p.delete("stab");
    p.delete("dtpl");
    p.delete("ndesign");
    p.delete("nround");
    p.delete("view");
    p.set("screen", next === "edit" ? "notes" : next);
    if (opts?.note) p.set("note", opts.note);
    else if (next !== "notes" && next !== "edit") p.delete("note");
    if (opts?.token) p.set("token", opts.token);
    else if (next !== "share") p.delete("token");
    const url = `${window.location.pathname}?${p.toString()}`;
    if (opts?.replace) window.history.replaceState({ screen: next }, "", url);
    else window.history.pushState({ screen: next }, "", url);
    if (opts?.note && (next === "notes" || next === "edit")) {
      window.dispatchEvent(new Event("hub-note-id"));
    }
  }, []);

  return { screen, navigate };
}
