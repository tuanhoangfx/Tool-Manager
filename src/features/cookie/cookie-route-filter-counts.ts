import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { TimeRange } from "../../lib/url-prefs";
import { enrichFilterDefs } from "../../lib/filter-option-counts";
import type { CookieBinding } from "./cookieBridge";
import { routeMatchesTimeRange } from "./cookie-route-activity";
import { COOKIE_ROUTE_FILTER_DEFS } from "./cookie-route-filters";
import type { NoteListItem } from "../notes/types";

export type CookieRouteRow = {
  binding: CookieBinding;
  note?: NoteListItem;
};

function routeType(domain: string) {
  return domain.includes("facebook") ? "facebook" : "custom";
}

function routeSource(binding: CookieBinding) {
  return binding.sourceBrowserId ? "locked" : "unset";
}

function rowHaystack({ binding, note }: CookieRouteRow) {
  return [
    binding.domain,
    binding.syncId,
    binding.noteId,
    binding.noteTitle,
    note?.title,
    note?.syncLabel,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesCookieRouteRow(
  row: CookieRouteRow,
  query: string,
  filterValues: FilterValues,
  range: TimeRange,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  const activeStatuses = filterValues.status ?? [];
  const activeTypes = filterValues.type ?? [];
  const activeSources = filterValues.source ?? [];
  const { binding, note } = row;
  const status = note?.sync_status ?? "pending";
  const type = routeType(binding.domain);
  const source = routeSource(binding);

  return (
    (!normalizedQuery || rowHaystack(row).includes(normalizedQuery)) &&
    (activeStatuses.length === 0 || activeStatuses.includes(status)) &&
    (activeTypes.length === 0 || activeTypes.includes(type)) &&
    (activeSources.length === 0 || activeSources.includes(source)) &&
    routeMatchesTimeRange(binding, note, range)
  );
}

function matchesCookieRouteOption(row: CookieRouteRow, filterKey: string, optionValue: string): boolean {
  const { binding, note } = row;
  switch (filterKey) {
    case "status":
      return (note?.sync_status ?? "pending") === optionValue;
    case "type":
      return routeType(binding.domain) === optionValue;
    case "source":
      return routeSource(binding) === optionValue;
    default:
      return false;
  }
}

export function cookieRouteFiltersWithCounts(
  rows: CookieRouteRow[],
  query: string,
  values: FilterValues,
  range: TimeRange,
): FilterDef[] {
  return enrichFilterDefs(
    rows,
    COOKIE_ROUTE_FILTER_DEFS,
    query,
    values,
    (row, q, filters) => matchesCookieRouteRow(row, q, filters, range),
    matchesCookieRouteOption,
  );
}
