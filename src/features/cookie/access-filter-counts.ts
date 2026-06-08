import type { FilterValues } from "../../components/sales-shell";
import { enrichFilterDefs, hubRouteAccessFilterDefs, type FilterDef } from "@tool-workspace/hub-ui";
import type { RouteAccessRow } from "./CookieRouteAccessTable";

const ACCESS_FILTER_DEFS = hubRouteAccessFilterDefs("single-route");

export { ACCESS_FILTER_DEFS };

function normalizedRole(role: string) {
  return role.toLowerCase();
}

function matchesAccessRow(row: RouteAccessRow, query: string, filterValues: FilterValues): boolean {
  const q = query.trim().toLowerCase();
  const roleFilters = filterValues.role ?? [];
  const permissionFilters = filterValues.permission ?? [];
  const haystack = [row.user, row.role].join(" ").toLowerCase();

  if (q && !haystack.includes(q)) return false;
  if (roleFilters.length && !roleFilters.includes(normalizedRole(row.role))) return false;
  if (permissionFilters.length) {
    const permissions = [row.canApply ? "load" : null, row.canPublish ? "sync" : null].filter(
      (value): value is string => Boolean(value),
    );
    if (!permissionFilters.some((value) => permissions.includes(value))) return false;
  }
  return true;
}

function matchesAccessOption(row: RouteAccessRow, filterKey: string, optionValue: string): boolean {
  switch (filterKey) {
    case "role":
      return normalizedRole(row.role) === optionValue;
    case "permission": {
      const permissions = [row.canApply ? "load" : null, row.canPublish ? "sync" : null].filter(
        (value): value is string => Boolean(value),
      );
      return permissions.includes(optionValue);
    }
    default:
      return false;
  }
}

export function accessFiltersWithCounts(
  rows: RouteAccessRow[],
  query: string,
  values: FilterValues,
): FilterDef[] {
  return enrichFilterDefs(
    rows,
    ACCESS_FILTER_DEFS,
    query,
    values,
    matchesAccessRow,
    matchesAccessOption,
  );
}
