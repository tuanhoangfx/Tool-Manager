export type HubDirectorySelectAllChipProps = {
  visibleCount: number;
  selectedCount: number;
  allVisibleSelected: boolean;
  onToggleSelectAll: () => void;
  /** Plural noun — screens, tools, users */
  noun?: string;
};

/** Card-view select-all control — filter row 2 leading slot. */
export function HubDirectorySelectAllChip({
  visibleCount,
  selectedCount,
  allVisibleSelected,
  onToggleSelectAll,
  noun = "items",
}: HubDirectorySelectAllChipProps) {
  if (visibleCount === 0) return null;

  const label = allVisibleSelected ? "Clear selection" : `Select all (${visibleCount})`;
  const title = allVisibleSelected
    ? `Clear ${selectedCount} selected ${noun}`
    : `Select all ${visibleCount} visible ${noun} on this page`;

  return (
    <button
      type="button"
      onClick={onToggleSelectAll}
      title={title}
      className={`inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
        allVisibleSelected || selectedCount > 0
          ? "border-indigo-400/35 bg-indigo-500/15 text-indigo-100 hover:bg-indigo-500/25"
          : "border-white/10 bg-white/[0.03] text-[var(--muted)] hover:bg-white/[0.06] hover:text-[var(--text)]"
      }`}
    >
      {label}
      {selectedCount > 0 && !allVisibleSelected ? (
        <span className="grid h-4 min-w-[var(--hub-count-badge-min-w)] place-items-center rounded-full bg-indigo-400 px-1 text-[9px] font-bold text-[#0f1220]">
          {selectedCount}
        </span>
      ) : null}
    </button>
  );
}
