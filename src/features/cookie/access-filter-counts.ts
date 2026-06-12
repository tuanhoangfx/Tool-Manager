import type { FilterValues } from "../../components/sales-shell";
import { enrichFilterDefs, hubRouteAccessFilterDefs, type FilterDef } from "@tool-workspace/hub-ui";
import type { RouteAccessRow } from "./CookieRouteAccessTable";

const ACCESS_FILTER_DEFS = hubRouteAccessFilterDefs("single-route");

export { ACCESS_FILTER_DEFS };

function normalizedRole(role: string) {
  return role.toLowerCase();
}

/** Access facet values — Owner, Load, Sync (aligned with CookieRouteAccessCell badges). */
export function rowAccessRoles(row: RouteAccessRow): string[] {
  if (row.id === "owner" || normalizedRole(row.role) === "owner") return ["owner"];
  const roles: string[] = [];
  if (row.canApply) roles.push("load");
  if (row.canPublish) roles.push("sync");
  if (roles.length === 0) roles.push(normalizedRole(row.role));
  return roles;
}

export function matchesAccessRow(row: RouteAccessRow, query: string, filterValues: FilterValues): boolean {
  const q = query.trim().toLowerCase();
  const roleFilters = filterValues.role ?? [];
  const haystack = [row.user, row.role, ...rowAccessRoles(row)].join(" ").toLowerCase();

  if (q && !haystack.includes(q)) return false;
  if (roleFilters.length && !roleFilters.some((value) => rowAccessRoles(row).includes(value))) {
    return false;
  }
  return true;
}

function matchesAccessOption(row: RouteAccessRow, filterKey: string, optionValue: string): boolean {
  if (filterKey === "role") {
    return rowAccessRoles(row).includes(optionValue);
  }
  return false;
}

export function filterAccessRows(
  rows: RouteAccessRow[],
  query: string,
  filterValues: FilterValues,
): RouteAccessRow[] {
  return rows.filter((row) => matchesAccessRow(row, query, filterValues));
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
