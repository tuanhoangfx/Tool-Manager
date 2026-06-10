import type { KeyboardEvent, ReactNode } from "react";

/** Golden directory card surface — shared by Dashboard / Hub / Users card grids. */
export const HUB_DIRECTORY_CARD_SURFACE =
  "relative flex h-full min-h-[var(--hub-card-min-h)] w-full flex-col rounded-xl border border-white/5 bg-[var(--panel)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-indigo-500/40 hover:bg-white/[0.02] hover:shadow-[0_8px_24px_rgba(99,102,241,0.12)]";
export const HUB_DIRECTORY_CARD_SELECTED = "ring-2 ring-inset ring-indigo-400/35 bg-indigo-500/5";

const PANEL_SURFACE =
  "relative flex h-full min-h-[var(--hub-card-min-h)] w-full flex-col anim-slide rounded-2xl border border-white/5 bg-[var(--panel)] p-4 pr-10 transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-emerald-500/25";

export type HubDirectoryCardShellVariant = "grid" | "panel";

export type HubDirectoryCardShellProps = {
  selected?: boolean;
  /** `grid` — P0004 directory card grid (default). `panel` — rounded panel cards (Users). */
  variant?: HubDirectoryCardShellVariant;
  isDetail?: boolean;
  detailRingClass?: string;
  className?: string;
  children: ReactNode;
};

function shellClass({
  selected,
  variant = "grid",
  isDetail,
  detailRingClass,
  className,
}: Omit<HubDirectoryCardShellProps, "children">) {
  const surface = variant === "grid" ? HUB_DIRECTORY_CARD_SURFACE : PANEL_SURFACE;
  return [
    surface,
    selected ? HUB_DIRECTORY_CARD_SELECTED : "",
    isDetail ? `ring-2 ${detailRingClass ?? "ring-emerald-500/40"}` : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Directory card surface — selection/detail rings without click handler. */
export function HubDirectoryCardShell(props: HubDirectoryCardShellProps) {
  return <article className={shellClass(props)}>{props.children}</article>;
}

export type HubDirectoryInteractiveCardProps = HubDirectoryCardShellProps & {
  ariaLabel: string;
  onActivate: () => void;
};

/** Directory card — row click / keyboard opens detail (bots, channels). */
export function HubDirectoryInteractiveCard({ ariaLabel, onActivate, children, ...shell }: HubDirectoryInteractiveCardProps) {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`${shellClass(shell)} cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400/35`}
      onClick={onActivate}
      onKeyDown={onKeyDown}
    >
      {children}
    </article>
  );
}

export type HubDirectoryCardCheckboxProps = {
  checked: boolean;
  label: string;
  onChange: () => void;
  /** Absolute top-right inside a `relative` card shell. */
  corner?: boolean;
  className?: string;
};

/** Bulk-select checkbox — stops card activation propagation. */
export function HubDirectoryCardCheckbox({
  checked,
  label,
  onChange,
  corner = true,
  className = "",
}: HubDirectoryCardCheckboxProps) {
  return (
    <label
      className={[
        "shrink-0 outline-none",
        corner ? "absolute right-3 top-3 z-10" : "pt-0.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="hub-checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
    </label>
  );
}
