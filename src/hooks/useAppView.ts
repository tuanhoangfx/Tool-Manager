import { useCallback, useEffect, useState } from "react";

export type AppView = "main" | "settings";

function readView(): AppView {
  if (typeof window === "undefined") return "main";
  return new URLSearchParams(window.location.search).get("view") === "settings" ? "settings" : "main";
}

export function useAppView() {
  const [view, setViewState] = useState<AppView>(() => readView());

  useEffect(() => {
    const onPop = () => setViewState(readView());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setView = useCallback((next: AppView) => {
    setViewState(next);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (next === "settings") params.set("view", "settings");
    else params.delete("view");
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.pushState(null, "", url);
  }, []);

  return {
    view,
    isSettings: view === "settings",
    setView,
  };
}
