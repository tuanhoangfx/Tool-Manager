import { Shield } from "lucide-react";
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
};

export function TwofaFilterToolbar({ range, limit, tableShown, filteredTotal, total }: Props) {
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
    </>
  );
}
