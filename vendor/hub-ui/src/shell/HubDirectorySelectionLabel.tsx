export type HubDirectorySelectionLabelProps = {
  visibleCount: number;
  selectedCount: number;
};

/** Table-view selection rail — Design V5 locked 2026-06 (mini progress + count). Read-only; use header checkbox for select-all. */
export function HubDirectorySelectionLabel({
  visibleCount,
  selectedCount,
}: HubDirectorySelectionLabelProps) {
  if (visibleCount === 0) return null;

  const pct = Math.round((selectedCount / visibleCount) * 100);

  return (
    <span className="hub-directory-selection-label" aria-live="polite">
      <span className="hub-directory-selection-label__track" aria-hidden>
        <span className="hub-directory-selection-label__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="hub-directory-selection-label__count">
        {selectedCount}/{visibleCount}
      </span>
    </span>
  );
}
