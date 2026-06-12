import { useEffect, useRef } from "react";
import type { WorkspaceNavScreen } from "./workspace-screen";
import { prefetchWorkspaceTab } from "./workspace-tab-prefetch";
import { prefetchSystemTab } from "./system-tab-prefetch";

/** Warm on boot — same screen user likely opens after Notes. */
const EAGER_PRIORITY_SCREENS: WorkspaceNavScreen[] = ["todo", "twofa"];

/** Remaining lazy tabs — staggered to avoid chunk/API storm (P0016 ConsoleEagerTabMount parity). */
const EAGER_TAB_STAGGER: { screen: WorkspaceNavScreen; delayMs: number }[] = [
  { screen: "cookie", delayMs: 1200 },
  { screen: "system", delayMs: 2000 },
];

const EAGER_PREFETCH_DELAY_MS = 400;

function prefetchTab(screen: WorkspaceNavScreen) {
  prefetchWorkspaceTab(screen);
  if (screen === "system") prefetchSystemTab();
}

/** Prefetch lazy chunks only — tabs mount via `visited` in WorkspaceApp (no eager DOM mount). */
export function WorkspaceEagerTabPrefetch() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    let cancelled = false;
    const staggerTimers: number[] = [];

    for (const screen of EAGER_PRIORITY_SCREENS) {
      prefetchTab(screen);
    }

    const bootTimer = window.setTimeout(() => {
      if (cancelled) return;
      ranRef.current = true;
      for (const { screen, delayMs } of EAGER_TAB_STAGGER) {
        const t = window.setTimeout(() => {
          if (cancelled) return;
          prefetchTab(screen);
        }, delayMs);
        staggerTimers.push(t);
      }
    }, EAGER_PREFETCH_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(bootTimer);
      for (const t of staggerTimers) window.clearTimeout(t);
    };
  }, []);

  return null;
}

export { EAGER_PRIORITY_SCREENS, EAGER_TAB_STAGGER };
