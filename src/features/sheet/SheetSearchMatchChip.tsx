import { Search } from "lucide-react";

/** Inline match count — FilterBar `searchTrailing` (golden P0016 inbox hint tone, hub indigo). */
export function SheetSearchMatchChip({ count }: { count: number }) {
  return (
    <span className="sheet-search-match-chip" role="status" title={`${count} text match${count === 1 ? "" : "es"}`}>
      <Search size={12} className="sheet-search-match-chip__icon" aria-hidden />
      <span className="tabular-nums">
        {count} match{count === 1 ? "" : "es"}
      </span>
    </span>
  );
}
