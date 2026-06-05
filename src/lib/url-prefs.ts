export type TimeRange = "all" | "today" | "yesterday" | "7d" | "30d" | "90d" | "1y";

export const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "all", label: "All" },
];

export const LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;

/** Default table/page row cap when URL has no `limit` param (P0020 2FA + Hub-style toolbars). */
export const DEFAULT_HUB_ROW_LIMIT = 25;

/** Hub list time-range when URL has no `range` param (omit from URL = this value). */
export const DEFAULT_HUB_TIME_RANGE: TimeRange = "all";

export type HubListPrefs = {
  range: TimeRange;
  limit: number;
  kpi: Set<string> | null;
  charts: Set<string> | null;
  /** Visible Hub filter dropdown keys (null = all defaults). */
  hubFilters: Set<string> | null;
  /** Visible Hub header status chips (null = defaults). */
  headerStats: Set<string> | null;
  /** Visible System header stats (null = defaults). */
  systemHeaderStats: Set<string> | null;
  /** Sticky pin for tab headers (default on). */
  headerPin: boolean;
  /** Sticky pin for Hub search/filter bar (default on). */
  searchPin: boolean;
};

/** `null` = defaults; `""` = explicitly none visible. */
export function parseHubPrefSet(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  if (raw === "") return new Set();
  return new Set(raw.split(",").filter(Boolean));
}

export function readHubListPrefs(): HubListPrefs {
  if (typeof window === "undefined") {
    return {
      range: DEFAULT_HUB_TIME_RANGE,
      limit: DEFAULT_HUB_ROW_LIMIT,
      kpi: null,
      charts: null,
      hubFilters: null,
      headerStats: null,
      systemHeaderStats: null,
      headerPin: true,
      searchPin: true,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  const range = (sp.get("range") ?? DEFAULT_HUB_TIME_RANGE) as TimeRange;
  const limitNum = Number(sp.get("limit"));
  const limit = (LIMIT_OPTIONS as readonly number[]).includes(limitNum) ? limitNum : DEFAULT_HUB_ROW_LIMIT;
  const hpin = sp.get("hpin");
  const spin = sp.get("spin");
  return {
    range: TIME_RANGES.some((r) => r.value === range) ? range : DEFAULT_HUB_TIME_RANGE,
    limit,
    kpi: parseHubPrefSet(sp.get("kpi")),
    charts: parseHubPrefSet(sp.get("charts")),
    hubFilters: parseHubPrefSet(sp.get("hfilt")),
    headerStats: parseHubPrefSet(sp.get("hstat")),
    systemHeaderStats: parseHubPrefSet(sp.get("sstat")),
    headerPin: hpin !== "0",
    searchPin: spin !== "0",
  };
}

/** Fired after URL prefs change — use instead of synthetic `popstate` (avoids tab navigation side effects). */
export const HUB_LIST_PREFS_CHANGE_EVENT = "hub-list-prefs-change";

export function subscribeHubListPrefs(onSync: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onSync();
  window.addEventListener(HUB_LIST_PREFS_CHANGE_EVENT, handler);
  window.addEventListener("popstate", handler);
  return () => {
    window.removeEventListener(HUB_LIST_PREFS_CHANGE_EVENT, handler);
    window.removeEventListener("popstate", handler);
  };
}

export function patchHubListPrefs(patch: Record<string, string | null>) {
  const sp = new URLSearchParams(window.location.search);
  for (const [k, v] of Object.entries(patch)) {
    if (v == null) sp.delete(k);
    else sp.set(k, v);
  }
  const q = sp.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`);
  window.dispatchEvent(new CustomEvent(HUB_LIST_PREFS_CHANGE_EVENT));
}
