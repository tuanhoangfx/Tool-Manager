import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import { enrichFilterDefs } from "../../lib/filter-option-counts";
import {
  buildTwofaServiceFilterOptions,
  filterTwofaAccounts,
  TWOFA_FILTER_DEFS,
} from "./twofa-filters";
import type { TwofaAccount } from "./types";

function matchesTwofaOption(row: TwofaAccount, filterKey: string, optionValue: string): boolean {
  switch (filterKey) {
    case "service":
      return (row.service.trim() || "Other") === optionValue;
    case "status":
      return row.status === optionValue;
    case "usage": {
      const now = Date.now();
      const weekMs = 7 * 86400000;
      const last = row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : NaN;
      const recent = Number.isFinite(last) && now - last <= weekMs;
      const never = !row.lastUsedAt;
      if (optionValue === "recent") return recent;
      if (optionValue === "never") return never;
      return false;
    }
    default:
      return false;
  }
}

export function twofaFiltersWithCounts(
  accounts: TwofaAccount[],
  query: string,
  values: FilterValues,
  period: WorkspacePeriodPrefs,
): FilterDef[] {
  const serviceOptions = buildTwofaServiceFilterOptions(accounts);
  const baseDefs = TWOFA_FILTER_DEFS.map((def) =>
    def.key === "service" ? { ...def, options: serviceOptions } : def,
  );

  return enrichFilterDefs(
    accounts,
    baseDefs,
    query,
    values,
    (row, q, filters) => filterTwofaAccounts([row], q, filters, period).length > 0,
    matchesTwofaOption,
  );
}
