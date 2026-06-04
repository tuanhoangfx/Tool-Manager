import { Check } from "lucide-react";

/** Shared Hub filter dropdown trigger — FilterBar + note folder picker. */
export function filterDropdownTriggerClass(active: boolean, extra = "") {
  return `inline-flex h-[34px] max-w-full items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    active
      ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-200"
      : "border-white/10 bg-[var(--panel-2)] text-[var(--text)] hover:bg-white/5"
  }${extra ? ` ${extra}` : ""}`;
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
