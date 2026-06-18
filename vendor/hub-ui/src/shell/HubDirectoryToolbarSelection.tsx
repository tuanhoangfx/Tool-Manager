export type HubDirectoryToolbarSelectionProps = {
  visibleCount: number;
  selectedCount: number;
  /** Plural noun for `title` — profiles, workflows, users */
  noun?: string;
};

type SelectionTier = "none" | "partial" | "half" | "max";

function resolveSelectionTier(selectedCount: number, visibleCount: number): SelectionTier {
  if (selectedCount <= 0) return "none";
  if (selectedCount >= visibleCount) return "max";
  const pct = (selectedCount / visibleCount) * 100;
  if (pct >= 50) return "half";
  return "partial";
}

/** Toolbar-row selection chip — V5+ always `x/y`, tier colors at 0% · 50% · max. */
export function HubDirectoryToolbarSelection({
  visibleCount,
  selectedCount,
  noun = "items",
}: HubDirectoryToolbarSelectionProps) {
  const safeVisible = Math.max(visibleCount, 0);
  const safeSelected = Math.max(0, Math.min(selectedCount, safeVisible || selectedCount));
  const denom = safeVisible > 0 ? safeVisible : Math.max(safeSelected, 1);
  const pct = denom > 0 ? Math.round((safeSelected / denom) * 100) : 0;
  const tier = resolveSelectionTier(safeSelected, denom);

  return (
    <span
      role="status"
      className={`hub-directory-toolbar-selection hub-directory-toolbar-selection--tier-${tier}`}
      title={`${safeSelected} of ${denom} ${noun} selected`}
      aria-live="polite"
      aria-label={`${safeSelected} of ${denom} selected`}
    >
      <span className="hub-directory-toolbar-selection__glow" aria-hidden />
      <span className="hub-directory-toolbar-selection__track" aria-hidden>
        <span className="hub-directory-toolbar-selection__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="hub-directory-toolbar-selection__count">
        <span className="hub-directory-toolbar-selection__selected">{safeSelected}</span>
        <span className="hub-directory-toolbar-selection__sep">/</span>
        <span className="hub-directory-toolbar-selection__visible">{denom}</span>
      </span>
    </span>
  );
}
