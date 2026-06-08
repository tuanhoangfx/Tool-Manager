import {
  configureHubUrlPrefs,
  HUB_LIST_PREFS_CHANGE_EVENT,
  parseHubPrefSet,
  patchHubListPrefs,
  readHubListPrefsCore,
  subscribeHubListPrefs,
  TIME_RANGES,
  LIMIT_OPTIONS,
  type TimeRange,
} from "@tool-workspace/hub-ui";

export type { TimeRange };
export {
  TIME_RANGES,
  LIMIT_OPTIONS,
  parseHubPrefSet,
  patchHubListPrefs,
  subscribeHubListPrefs,
  HUB_LIST_PREFS_CHANGE_EVENT,
};

/** Default table/page row cap when URL has no `limit` param (P0020 2FA + Hub-style toolbars). */
export const DEFAULT_HUB_ROW_LIMIT = 25;

/** Hub list time-range when URL has no `range` param (omit from URL = this value). */
export const DEFAULT_HUB_TIME_RANGE: TimeRange = "all";

export type HubListPrefs = {
  range: TimeRange;
  limit: number;
  tablePageSize: number;
  kpi: Set<string> | null;
  charts: Set<string> | null;
  hubFilters: Set<string> | null;
  headerStats: Set<string> | null;
  systemHeaderStats: Set<string> | null;
  headerPin: boolean;
  searchPin: boolean;
};

configureHubUrlPrefs({
  defaultRange: DEFAULT_HUB_TIME_RANGE,
  defaultLimit: DEFAULT_HUB_ROW_LIMIT,
  usePrefsChangeEvent: true,
});

export function readHubListPrefs(): HubListPrefs {
  return readHubListPrefsCore();
}
