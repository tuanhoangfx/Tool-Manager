import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import { enrichFilterDefs } from "../../lib/filter-option-counts";
import type { CookieBinding } from "./cookieBridge";
import { routeMatchesTimeRange } from "./cookie-route-activity";
import { buildCookiePlatformOptions, routePlatformKey } from "./cookie-route-platform";
import { COOKIE_ROUTE_FILTER_DEFS } from "./cookie-route-filters";
import { resolveRouteFilterStatus } from "./route-sync-display";
import { lookupVaultRow, type CookieVaultRow } from "./useCookieVaultMap";
import type { NoteListItem } from "../notes/types";

export type CookieRouteRow = {
  binding: CookieBinding;
  note?: NoteListItem;
};

function rowHaystack({ binding, note }: CookieRouteRow) {
  return [
    binding.domain,
    binding.syncId,
    binding.noteId,
    binding.noteTitle,
    binding.ownerUserEmail,
    note?.title,
    note?.syncLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function routeFilterStatus(
  row: CookieRouteRow,
  vaultByKey: Record<string, CookieVaultRow>,
): string {
  const vault = lookupVaultRow(vaultByKey, row.binding.noteId, row.binding.domain);
  return resolveRouteFilterStatus({
    syncStatus: row.note?.sync_status,
    noteSyncedAt: row.note?.synced_at,
    vaultCookieCount: vault?.cookie_count,
  });
}

function matchesCookieRouteRow(
  row: CookieRouteRow,
  query: string,
  filterValues: FilterValues,
  period: WorkspacePeriodPrefs,
  vaultByKey: Record<string, CookieVaultRow>,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const activeStatuses = filterValues.status ?? [];
  const activePlatforms = filterValues.platform ?? [];
  // Legacy keys (type / source) intentionally ignored — removed from Cookie Auto filters.
  const { binding } = row;
  const status = routeFilterStatus(row, vaultByKey);
  const platform = routePlatformKey(binding.domain);

  return (
    (!normalizedQuery || rowHaystack(row).includes(normalizedQuery)) &&
    (activeStatuses.length === 0 || activeStatuses.includes(status)) &&
    (activePlatforms.length === 0 || activePlatforms.includes(platform)) &&
    routeMatchesTimeRange(binding, row.note, period)
  );
}

function matchesCookieRouteOption(
  row: CookieRouteRow,
  filterKey: string,
  optionValue: string,
  vaultByKey: Record<string, CookieVaultRow>,
): boolean {
  const { binding } = row;
  switch (filterKey) {
    case "status":
      return routeFilterStatus(row, vaultByKey) === optionValue;
    case "platform":
      return routePlatformKey(binding.domain) === optionValue;
    default:
      return false;
  }
}

export function filterCookieRows<T extends CookieRouteRow>(
  rows: T[],
  query: string,
  filterValues: FilterValues,
  period: WorkspacePeriodPrefs,
  vaultByKey: Record<string, CookieVaultRow> = {},
): T[] {
  return rows.filter((row) => matchesCookieRouteRow(row, query, filterValues, period, vaultByKey));
}

export function cookieRouteFiltersWithCounts(
  rows: CookieRouteRow[],
  query: string,
  values: FilterValues,
  period: WorkspacePeriodPrefs,
  vaultByKey: Record<string, CookieVaultRow> = {},
): FilterDef[] {
  const platformOptions = buildCookiePlatformOptions(rows);
  const defs = COOKIE_ROUTE_FILTER_DEFS.map((def) =>
    def.key === "platform" ? { ...def, options: platformOptions } : def,
  );

  return enrichFilterDefs(
    rows,
    defs,
    query,
    values,
    (row, q, filters) => matchesCookieRouteRow(row, q, filters, period, vaultByKey),
    (row, key, opt) => matchesCookieRouteOption(row, key, opt, vaultByKey),
  );
}
