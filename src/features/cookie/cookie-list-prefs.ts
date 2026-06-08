import { patchHubListPrefs } from "../../lib/url-prefs";

/** Cookie routes directory ordering (URL `csort`). */
export type CookieListSort = "updated" | "created" | "platform" | "title";

export const DEFAULT_COOKIE_LIST_SORT: CookieListSort = "updated";

const COOKIE_SORT_VALUES = new Set<CookieListSort>(["updated", "created", "platform", "title"]);

export function parseCookieListSort(raw: string | null): CookieListSort {
  if (raw && COOKIE_SORT_VALUES.has(raw as CookieListSort)) return raw as CookieListSort;
  return DEFAULT_COOKIE_LIST_SORT;
}

export function cookieSortLabel(sort: CookieListSort): string {
  switch (sort) {
    case "created":
      return "Recently created";
    case "platform":
      return "Platform A–Z";
    case "title":
      return "Title A–Z";
    case "updated":
    default:
      return "Recently synced";
  }
}

export function cookieSortSettingLabel(sort: CookieListSort): string {
  switch (sort) {
    case "created":
      return "Created";
    case "platform":
      return "Platform";
    case "title":
      return "A–Z";
    case "updated":
    default:
      return "Edited";
  }
}

export function readCookieListPrefs(): { sort: CookieListSort } {
  if (typeof window === "undefined") return { sort: DEFAULT_COOKIE_LIST_SORT };
  const sp = new URLSearchParams(window.location.search);
  return { sort: parseCookieListSort(sp.get("csort")) };
}

export function patchCookieListPrefs(patch: Record<string, string | null>) {
  patchHubListPrefs(patch);
}
