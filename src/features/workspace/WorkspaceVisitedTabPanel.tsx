import type { ReactNode } from "react";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";

type Props = {
  tabId: WorkspaceNavScreen;
  active: boolean;
  visited: Set<WorkspaceNavScreen>;
  children: ReactNode;
  className?: string;
};

/** Mount tab content on first visit; hide with CSS when inactive (Hub keep-mounted). */
export function WorkspaceVisitedTabPanel({ tabId, active, visited, children, className }: Props) {
  if (!visited.has(tabId)) return null;
  return (
    <div
      className={active ? className ?? "flex min-h-0 min-w-0 flex-1 flex-col" : `hidden ${className ?? ""}`.trim()}
      aria-hidden={!active}
    >
      {children}
    </div>
  );
}
