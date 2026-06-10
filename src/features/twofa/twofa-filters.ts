import type { FilterOption, FilterValues } from "../../components/sales-shell";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";
import type { TwofaAccount } from "./types";
import { matchesWorkspacePeriod, type WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import { normalizeSecret } from "./twofa-secret-normalize";
import { twofaActivityAt } from "./twofa-time";

export { DEFAULT_TWOFA_FILTER_KEYS, TWOFA_FILTER_DEFS } from "./twofa-filter-defs";

export function buildTwofaServiceFilterOptions(accounts: TwofaAccount[]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const row of accounts) {
    const key = row.service.trim() || "Other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) => {
      const brand = resolveTwofaPlatformIcon(value);
      return { value, label: value, count, iconSrc: brand?.src };
    });
}

export function filterTwofaAccounts(
  accounts: TwofaAccount[],
  query: string,
  filterValues: FilterValues,
  period: WorkspacePeriodPrefs,
): TwofaAccount[] {
  const q = query.trim().toLowerCase();
  const serviceFilters = filterValues.service ?? [];
  const usageFilters = filterValues.usage ?? [];
  const now = Date.now();
  const weekMs = 7 * 86400000;

  return accounts.filter((row) => {
    if (q) {
      const haystack = [row.service, row.browser, row.account, row.secret].join(" ").toLowerCase();
      const secretHay = normalizeSecret(row.secret).toLowerCase();
      const qSecret = normalizeSecret(q).toLowerCase();
      const matchText = haystack.includes(q) || (qSecret.length >= 8 && secretHay.includes(qSecret));
      if (!matchText) return false;
    }

    if (serviceFilters.length && !serviceFilters.includes(row.service.trim() || "Other")) {
      return false;
    }

    if (usageFilters.length) {
      const last = row.lastUsedAt ? new Date(row.lastUsedAt).getTime() : NaN;
      const recent = Number.isFinite(last) && now - last <= weekMs;
      const never = !row.lastUsedAt;
      const ok =
        (usageFilters.includes("recent") && recent) ||
        (usageFilters.includes("never") && never);
      if (!ok) return false;
    }

    return matchesWorkspacePeriod(twofaActivityAt(row), period);
  });
}
