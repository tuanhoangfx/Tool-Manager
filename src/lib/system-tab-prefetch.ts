import { prefetchWorkspaceTab, prefetchWorkspaceTabIdle } from "./workspace-tab-prefetch";

/** Warm System tab lazy chunk on sidebar hover / idle boot. */
export function prefetchSystemTab(): void {
  prefetchWorkspaceTab("system");
}

export function prefetchSystemTabIdle(timeoutMs = 1200): void {
  prefetchWorkspaceTabIdle("system", timeoutMs);
}
