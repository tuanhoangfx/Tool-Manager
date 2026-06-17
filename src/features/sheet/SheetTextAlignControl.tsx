import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { SheetTextAlign } from "./sheet-grid-prefs";

const OPTIONS: { id: SheetTextAlign; label: string; icon: typeof AlignLeft }[] = [
  { id: "left", label: "Align left", icon: AlignLeft },
  { id: "center", label: "Align center", icon: AlignCenter },
  { id: "right", label: "Align right", icon: AlignRight },
];

/** Horizontal alignment — 3-icon toggle row (Display panel). */
export function SheetTextAlignControl({
  value,
  onChange,
}: {
  value: SheetTextAlign;
  onChange: (next: SheetTextAlign) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">Horizontal align</p>
      <div
        className="inline-flex rounded-lg border border-white/10 bg-white/[.03] p-0.5"
        role="radiogroup"
        aria-label="Horizontal align"
      >
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              title={label}
              className={`inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
                active
                  ? "bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/35"
                  : "text-[var(--muted)] hover:bg-white/[.06] hover:text-[var(--text)]"
              }`}
              onClick={() => onChange(id)}
            >
              <Icon size={14} aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}
