import { Search, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  FILTER_DROPDOWN_PANEL_CLASS,
  FILTER_DROPDOWN_ROW_CLASS,
  FilterDropdownCircle,
  FilterDropdownTrigger,
} from "./filter-dropdown-ui";

export type HubFilterSelectOption = {
  value: string;
  label: string;
  leading?: ReactNode;
};

type Props = {
  value: string;
  options: HubFilterSelectOption[];
  onChange: (value: string) => void;
  /** Used in search placeholder, e.g. "note" → Search note... */
  filterLabel: string;
  placeholder?: string;
  disabled?: boolean;
  panelAlign?: "left" | "right";
  TriggerIcon?: LucideIcon;
  className?: string;
};

/** Hub FilterBar-style single select — search + checkbox circle (one value). */
export function HubFilterSingleSelect({
  value,
  options,
  onChange,
  filterLabel,
  placeholder,
  disabled,
  panelAlign = "left",
  TriggerIcon,
  className = "w-full",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected?.label ?? placeholder ?? `Select ${filterLabel.toLowerCase()}…`;
  const active = Boolean(value && selected);

  const filtered = options.filter(
    (o) => !search || o.label.toLowerCase().includes(search.toLowerCase()),
  );

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <FilterDropdownTrigger
        active={active}
        open={open}
        label={triggerLabel}
        Icon={TriggerIcon}
        disabled={disabled}
        className="w-full !max-w-none justify-between"
        onClick={() => setOpen((v) => !v)}
      />

      {open ? (
        <div className={`${FILTER_DROPDOWN_PANEL_CLASS} ${panelAlign === "right" ? "right-0" : "left-0"}`}>
          <div className="border-b border-white/5 p-2">
            <div className="relative">
              <Search
                size={12}
                className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden
              />
              <input
                type="search"
                name={`p0020-filter-single-${filterLabel.replace(/\s+/g, "-").toLowerCase()}`}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${filterLabel.toLowerCase()}…`}
                className="field text-xs"
                style={{ paddingLeft: 28, paddingTop: 4, paddingBottom: 4 }}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-72 overflow-auto p-1">
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={FILTER_DROPDOWN_ROW_CLASS}
              >
                <FilterDropdownCircle checked={value === o.value} />
                {o.leading ?? null}
                <span className="min-w-0 flex-1 truncate text-left" title={o.label}>
                  {o.label}
                </span>
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--muted)]">No matches</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
