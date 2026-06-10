import { createModulePrefetch } from "@dev/hub-load";
import type { WorkspaceNavScreen } from "./workspace-screen";

const { prefetch, prefetchAll, prefetchIdle } = createModulePrefetch<WorkspaceNavScreen>({
  notes: async () => {},
  todo: () => import("../features/todo/TodoScreen"),
  twofa: () => import("../features/twofa/TwofaManagerScreen"),
  cookie: () => import("../features/cookie/CookieSyncScreen"),
  system: () => import("../features/system/SystemDesignTemplateScreen"),
});

/** Warm lazy tab chunks before switch (sidebar hover / idle). */
export function prefetchWorkspaceTab(tab: WorkspaceNavScreen): void {
  prefetch(tab);
}

export function prefetchAllWorkspaceTabs(): void {
  prefetchAll();
}

export function prefetchWorkspaceTabIdle(tab: WorkspaceNavScreen, timeoutMs?: number): void {
  prefetchIdle(tab, timeoutMs);
}
