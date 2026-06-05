import { Check, ChevronDown, FolderOpen, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Shared Hub filter dropdown trigger — FilterBar + note folder picker. */
export function filterDropdownTriggerClass(active: boolean, extra = "") {
  return `inline-flex h-[var(--hub-control-h)] max-w-full items-center gap-1.5 rounded-lg border px-3 text-xs font-normal transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    active
      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-200"
      : "border-white/10 bg-[var(--panel-2)] text-[var(--text)] hover:bg-white/5"
  }${extra ? ` ${extra}` : ""}`;
}

export function folderFilterButtonLabel(
  label: string,
  selectedCount: number,
  soleName?: string,
  showAllLabel = true,
): string {
  if (selectedCount === 0) return showAllLabel ? `All ${label}` : label;
  if (selectedCount === 1) return `${label}: ${soleName ?? "1"}`;
  return `${label}: ${selectedCount} selected`;
}

type FilterDropdownTriggerProps = {
  active: boolean;
  open?: boolean;
  label: string;
  /** Show indigo count pill when &gt; 1. */
  count?: number;
  /** Tint folder icon when one folder is selected. */
  iconColor?: string | null;
  Icon?: LucideIcon;
  icon?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  className?: string;
};

export function FilterDropdownTrigger({
  active,
  open = false,
  label,
  count,
  iconColor,
  Icon = FolderOpen,
  icon,
  disabled,
  onClick,
  title,
  className = "",
}: FilterDropdownTriggerProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={filterDropdownTriggerClass(active, className)}
    >
      {icon ?? (
        <Icon
          size={12}
          className={`shrink-0 ${iconColor ? "" : "opacity-75"}`}
          style={iconColor ? { color: iconColor } : undefined}
          aria-hidden
        />
      )}
      <span className="min-w-0 max-w-[12rem] truncate">{label}</span>
      {count != null && count > 1 ? (
        <span className="grid h-4 min-w-[16px] shrink-0 place-items-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold leading-none text-white">
          {count}
        </span>
      ) : null}
      <ChevronDown size={12} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
    </button>
  );
}

export function FilterDropdownCircle({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <div
      className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all ${
        checked
          ? "border-indigo-400 bg-indigo-500"
          : indeterminate
            ? "border-indigo-400 bg-indigo-500/30"
            : "border-white/25"
      }`}
      aria-hidden
    >
      {checked || indeterminate ? (
        indeterminate ? (
          <div className="h-1 w-2 rounded-full bg-white" />
        ) : (
          <Check size={9} className="text-white" />
        )
      ) : null}
    </div>
  );
}

export const FILTER_DROPDOWN_PANEL_CLASS =
  "anim-pop absolute top-full z-30 mt-1 w-72 rounded-xl border border-white/10 bg-[var(--panel)] shadow-xl shadow-black/40";

export const FILTER_DROPDOWN_ROW_CLASS =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/5";
