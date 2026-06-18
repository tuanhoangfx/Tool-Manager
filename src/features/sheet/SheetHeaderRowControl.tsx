import type { SheetHeaderRowCandidate } from "./sheet-header-row-candidates";

/** Pick which CSV row is the column header when sheet has spacer rows above headers. */
export function SheetHeaderRowControl({
  value,
  candidates,
  onChange,
}: {
  value: number;
  candidates: SheetHeaderRowCandidate[];
  onChange: (index: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">Header row</p>
      <select
        className="hub-chrome-type--micro w-full rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[11px] text-[var(--text)] outline-none focus:border-indigo-400/40"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Header row"
      >
        {candidates.map((c) => (
          <option key={c.index} value={c.index}>
            Row {c.index + 1}: {c.preview}
          </option>
        ))}
      </select>
    </div>
  );
}
