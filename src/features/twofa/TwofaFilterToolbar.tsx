import { GitMerge, Shield } from "lucide-react";
import { HubResultCount, HubRowLimitSelect, HubTimeRangeSelect } from "../../components/sales-shell";
import type { TimeRange } from "../../lib/url-prefs";

type Props = {
  range: TimeRange;
  limit: number;
  /** Rows rendered in the table (after row limit). */
  tableShown: number;
  /** Rows matching search/filters. */
  filteredTotal: number;
  /** All accounts in vault. */
  total: number;
  onDedupe?: () => void;
};

export function TwofaFilterToolbar({
  range,
  limit,
  tableShown,
  filteredTotal,
  total,
  onDedupe,
}: Props) {
  return (
    <>
      <HubTimeRangeSelect value={range} />
      <HubRowLimitSelect value={limit} />
      <HubResultCount icon={Shield} shown={tableShown} total={filteredTotal} />
      {filteredTotal < total ? (
        <span
          className="inline-flex h-[var(--hub-control-h)] shrink-0 items-center rounded-lg border border-white/10 bg-white/[.03] px-2.5 text-[10px] tabular-nums text-[var(--muted)]"
          title="Accounts in vault"
        >
          vault {total}
        </span>
      ) : null}
      {onDedupe ? (
        <button
          type="button"
          className="inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1 rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 text-[10px] font-semibold text-amber-200/90 transition-colors hover:bg-amber-400/20"
          title="Remove duplicate accounts (same platform + ID, or same secret-only)"
          onClick={onDedupe}
        >
          <GitMerge size={12} aria-hidden />
          Dedupe
        </button>
      ) : null}
    </>
  );
}
