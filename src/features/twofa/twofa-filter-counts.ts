import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import {
  buildTwofaServiceFilterOptions,
  rowMatchesTwofaFilters,
  TWOFA_FILTER_DEFS,
} from "./twofa-filters";
import type { TwofaAccount } from "./types";
import { isTwofaMailAccount, type TwofaVaultScope } from "./twofa-vault-scope";

function bumpTwofaOptionCount(
  row: TwofaAccount,
  filterKey: string,
  counts: Map<string, number>,
): void {
  switch (filterKey) {
    case "service": {
      const key = row.service.trim() || "Other";
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return;
    }
    case "status":
      counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
      return;
    case "usage": {
      const now = Date.now();
      const weekMs = 7 * 86400000;
      const last = row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : NaN;
      const recent = Number.isFinite(last) && now - last <= weekMs;
      const never = !row.lastUsedAt;
      if (recent) counts.set("recent", (counts.get("recent") ?? 0) + 1);
      if (never) counts.set("never", (counts.get("never") ?? 0) + 1);
      return;
    }
    default:
      return;
  }
}

/** Hub-UI faceted counts — O(n) per filter key (safe for 2k+ vault rows). */
function enrichTwofaFilterDefs(
  accounts: TwofaAccount[],
  defs: FilterDef[],
  query: string,
  values: FilterValues,
  period: WorkspacePeriodPrefs,
): FilterDef[] {
  const vaultSize = accounts.length;
  return defs.map((def) => {
    const other: FilterValues = { ...values };
    delete other[def.key];
    const counts = new Map(def.options.map((opt) => [opt.value, 0]));
    let total = 0;

    for (const row of accounts) {
      if (!rowMatchesTwofaFilters(row, query, other, period, vaultSize)) continue;
      total += 1;
      bumpTwofaOptionCount(row, def.key, counts);
    }

    return {
      ...def,
      totalCount: total,
      options: def.options.map((opt) => ({
        ...opt,
        count: counts.get(opt.value) ?? 0,
      })),
    };
  });
}

export function twofaFiltersWithCounts(
  accounts: TwofaAccount[],
  query: string,
  values: FilterValues,
  period: WorkspacePeriodPrefs,
  vaultScope: TwofaVaultScope = "services",
): FilterDef[] {
  const serviceOptions = buildTwofaServiceFilterOptions(accounts, vaultScope);
  const baseDefs = TWOFA_FILTER_DEFS.map((def) =>
    def.key === "service" ? { ...def, options: serviceOptions } : def,
  );

  return enrichTwofaFilterDefs(accounts, baseDefs, query, values, period);
}
