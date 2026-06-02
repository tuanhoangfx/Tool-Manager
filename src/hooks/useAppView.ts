import { useCallback, useEffect, useState } from "react";

export type AppView = "main" | "settings";

function readView(): AppView {
  if (typeof window === "undefined") return "main";
  // Settings view has been deprecated; keep backward compatibility for old URLs.
  // Strip `?view=settings` while still returning a valid view.
  const v = new URLSearchParams(window.location.search).get("view");
  return v === "settings" ? "main" : "main";
}

export function useAppView() {
  const [view, setViewState] = useState<AppView>(() => readView());

  useEffect(() => {
    const onPop = () => setViewState(readView());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setView = useCallback((next: AppView) => {
    // Coerce deprecated view to avoid dead-state.
    const safeNext: AppView = next === "settings" ? "main" : next;
    setViewState(safeNext);
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    const query = params.toString();
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.pushState(null, "", url);
  }, []);

  return {
    view,
    isSettings: false,
    setView,
  };
}
