import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Pin Kanban filter bar while scrolling — Hub-UI hub-filter-sticky pattern. */
export function TodoFilterSticky({ children, className }: Props) {
  return (
    <div
      className={`hub-filter-sticky sticky z-[35] -mx-1 mb-4 border-b border-white/5 bg-[var(--bg)] px-1 pb-3 pt-0 sm:-mx-2 sm:px-2 ${className ?? ""}`.trim()}
    >
      {children}
    </div>
  );
}
