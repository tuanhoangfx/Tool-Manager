import type { FilterDef, FilterValues } from "../../components/sales-shell";
import { enrichFilterDefs } from "../../lib/filter-option-counts";
import type { RouteAccessRow } from "./CookieRouteAccessTable";

const ACCESS_FILTER_DEFS: FilterDef[] = [
  {
    key: "role",
    label: "Access",
    showAllLabel: true,
    options: [
      { value: "owner", label: "Owner", color: "#a78bfa" },
      { value: "load", label: "Load", color: "#38bdf8" },
      { value: "sync", label: "Sync", color: "#818cf8" },
    ],
  },
  {
    key: "permission",
    label: "Permission",
    showAllLabel: true,
    options: [
      { value: "load", label: "Load", color: "#34d399" },
      { value: "sync", label: "Sync", color: "#818cf8" },
    ],
  },
  {
    key: "status",
    label: "Route",
    showAllLabel: true,
    options: [
      { value: "published", label: "Published", color: "#818cf8" },
      { value: "missing", label: "Missing", color: "#f59e0b" },
    ],
  },
];

export { ACCESS_FILTER_DEFS };

function normalizedRole(role: string) {
  return role.toLowerCase();
}

function routeState(published: boolean) {
  return published ? "published" : "missing";
}

function matchesAccessRow(
  row: RouteAccessRow,
  query: string,
  filterValues: FilterValues,
  routePublished: boolean,
): boolean {
  const q = query.trim().toLowerCase();
  const roleFilters = filterValues.role ?? [];
  const permissionFilters = filterValues.permission ?? [];
  const routeFilters = filterValues.status ?? [];
  const state = routeState(routePublished);
  const haystack = [row.user, row.role, state].join(" ").toLowerCase();

  if (q && !haystack.includes(q)) return false;
  if (roleFilters.length && !roleFilters.includes(normalizedRole(row.role))) return false;
  if (routeFilters.length && !routeFilters.includes(state)) return false;
  if (permissionFilters.length) {
    const permissions = [row.canApply ? "load" : null, row.canPublish ? "sync" : null].filter(
      (value): value is string => Boolean(value),
    );
    if (!permissionFilters.some((value) => permissions.includes(value))) return false;
  }
  return true;
}

function matchesAccessOption(
  row: RouteAccessRow,
  filterKey: string,
  optionValue: string,
  routePublished: boolean,
): boolean {
  switch (filterKey) {
    case "role":
      return normalizedRole(row.role) === optionValue;
    case "status":
      return routeState(routePublished) === optionValue;
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
  routePublished: boolean,
): FilterDef[] {
  return enrichFilterDefs(
    rows,
    ACCESS_FILTER_DEFS,
    query,
    values,
    (row, q, filters) => matchesAccessRow(row, q, filters, routePublished),
    (row, key, opt) => matchesAccessOption(row, key, opt, routePublished),
  );
}
