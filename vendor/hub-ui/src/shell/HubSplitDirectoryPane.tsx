import type { ReactNode } from "react";

export const HUB_SPLIT_DIRECTORY_PANE_CLASS =
  "hub-split-directory-pane flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[var(--panel)]";

export type HubSplitDirectoryPaneVariant = "panel" | "rail";

export type HubSplitDirectoryPaneProps = {
  /** HubSplitDirectoryFilterBar — frameless FilterBar inside unified pane chrome. */
  filterBar: ReactNode;
  /** Directory table (`HubDirectoryTableShell` with `flushWrap`). */
  children: ReactNode;
  className?: string;
  variant?: HubSplitDirectoryPaneVariant;
  /** Scroll table body on panel pane (`hub-split-scroll--panel`). */
  scroll?: boolean;
  /** Fit exactly N table rows — no inner scrollbars (workflow rail). */
  fixedRows?: number;
};

/**
 * Golden split-workspace directory pane — FilterBar + table in **one** frame.
 * Golden: P0001 Profiles directory · Workflow rail · P0020 split list panes.
 */
export function HubSplitDirectoryPane({
  filterBar,
  children,
  className = "",
  variant = "panel",
  scroll = false,
  fixedRows,
}: HubSplitDirectoryPaneProps) {
  const scrollClass =
    !fixedRows && scroll && variant === "rail"
      ? " hub-split-scroll hub-split-scroll--rail"
      : !fixedRows && scroll
        ? " hub-split-scroll hub-split-scroll--panel"
        : "";

  const fixedClass = fixedRows ? " hub-split-directory-pane--fixed-rows" : "";

  return (
    <section
      className={`${HUB_SPLIT_DIRECTORY_PANE_CLASS}${fixedClass}${className ? ` ${className}` : ""}`}
      {...(fixedRows ? { "data-fixed-rows": fixedRows } : {})}
    >
      <div className="hub-split-directory-pane__filters shrink-0 border-b border-white/5 px-3 py-3">{filterBar}</div>
      <div className={`hub-split-directory-pane__body flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-3${scrollClass}`}>
        {children}
      </div>
    </section>
  );
}
