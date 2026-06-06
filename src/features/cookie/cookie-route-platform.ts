import type { FilterOption } from "../../components/sales-shell";
import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import type { CookieRouteRow } from "./cookie-route-filter-counts";

/** Stable filter value for a route domain (registry label slug or `other`). */
export function routePlatformKey(domain: string): string {
  const site = resolveCookieSiteIcon(domain);
  if (!site) return "other";
  return site.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildCookiePlatformOptions(rows: CookieRouteRow[]): FilterOption[] {
  const byKey = new Map<string, FilterOption>();

  for (const row of rows) {
    const key = routePlatformKey(row.binding.domain);
    if (byKey.has(key)) continue;
    const site = resolveCookieSiteIcon(row.binding.domain);
    byKey.set(key, {
      value: key,
      label: site?.label ?? "Other",
      iconSrc: site?.src,
    });
  }

  return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
}
