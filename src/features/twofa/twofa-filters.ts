import type { FilterOption, FilterValues } from "../../components/sales-shell";
import { resolveTwofaPlatformIcon } from "./twofa-platform-icon";
import type { TwofaAccount } from "./types";
import { isTwofaMailAccount, type TwofaVaultScope } from "./twofa-vault-scope";
import { matchesWorkspacePeriod, type WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import { normalizeSecret } from "./twofa-secret-normalize";
import { twofaActivityAt } from "./twofa-time";

export { DEFAULT_TWOFA_FILTER_KEYS, TWOFA_FILTER_DEFS } from "./twofa-filter-defs";

const LARGE_VAULT_SEARCH = 2_000;

/** Vaults above this row count debounce directory filter (~150ms) to keep typing smooth. */
export const TWOFA_LARGE_VAULT_THRESHOLD = LARGE_VAULT_SEARCH;

export function buildTwofaServiceFilterOptions(
  accounts: TwofaAccount[],
  vaultScope: TwofaVaultScope = "services",
): FilterOption[] {
  const counts = new Map<string, number>();
  for (const row of accounts) {
    if (vaultScope === "services" && isTwofaMailAccount(row)) continue;
    if (vaultScope === "mail" && !isTwofaMailAccount(row)) continue;
    const key = row.service.trim() || "Other";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([value, count]) => {
      const brand = resolveTwofaPlatformIcon(value);
      return {
        value,
        label: value,
        count,
        iconSrc: brand?.src,
        iconShell: brand?.shell,
      };
    });
}

export function filterTwofaAccounts(
  accounts: TwofaAccount[],
  query: string,
  filterValues: FilterValues,
  period: WorkspacePeriodPrefs,
): TwofaAccount[] {
  return accounts.filter((row) =>
    rowMatchesTwofaFilters(row, query, filterValues, period, accounts.length),
  );
}

/** Single-row filter match — shared by directory filter + faceted filter counts. */
export function rowMatchesTwofaFilters(
  row: TwofaAccount,
  query: string,
  filterValues: FilterValues,
  period: WorkspacePeriodPrefs,
  vaultSize = 0,
): boolean {
  const q = query.trim().toLowerCase();
  const serviceFilters = filterValues.service ?? [];
  const statusFilters = filterValues.status ?? [];
  const usageFilters = filterValues.usage ?? [];
  const now = Date.now();
  const weekMs = 7 * 86400000;
  const largeVault = vaultSize > LARGE_VAULT_SEARCH;

  if (q) {
    const haystack = [
      row.service,
      row.browser,
      row.account,
      row.mailRecover,
      row.password,
      row.note,
      row.secret,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const logHay =
      largeVault ? "" : (row.log ?? []).map((entry) => entry.message).join(" ").toLowerCase();
    const secretHay = normalizeSecret(row.secret).toLowerCase();
    const qSecret = normalizeSecret(q).toLowerCase();
    const matchText =
      haystack.includes(q) ||
      logHay.includes(q) ||
      (qSecret.length >= 8 && secretHay.includes(qSecret));
    if (!matchText) return false;
  }

  if (serviceFilters.length && !serviceFilters.includes(row.service.trim() || "Other")) {
    return false;
  }

  if (statusFilters.length && !statusFilters.includes(row.status)) {
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
}
