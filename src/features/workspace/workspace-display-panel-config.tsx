import { useEffect, useState, type ReactNode } from "react";
import type { HubDirectoryDisplayPanelProps } from "@tool-workspace/hub-ui";
import type { FilterDef } from "../../components/sales-shell";
import {
  COOKIE_CHART_DEFS,
  COOKIE_FILTER_DEFS,
  COOKIE_HEADER_STAT_DEFS,
  COOKIE_KPI_DEFS,
  DEFAULT_COOKIE_CHART_KEYS,
  DEFAULT_COOKIE_HEADER_STAT_KEYS,
  DEFAULT_COOKIE_KPI_KEYS,
  DEFAULT_COOKIE_ROUTE_FILTER_KEYS,
} from "../cookie/cookie-display-prefs";
import { stripLegacyCookieFilterKeys } from "../cookie/cookie-filter-icons";
import { patchCookieHubPrefs, readCookieHubPrefs } from "../cookie/cookie-tab-prefs";
import {
  DEFAULT_NOTES_HEADER_STAT_KEYS,
  NOTES_FILTER_PREF_DEFS,
  NOTES_HEADER_STAT_DEFS,
} from "../notes/notes-display-prefs";
import { DEFAULT_NOTES_FILTER_KEYS } from "../notes/notes-list-prefs";
import {
  DEFAULT_SHEET_HEADER_STAT_KEYS,
  SHEET_HEADER_STAT_DEFS,
} from "../sheet/sheet-display-prefs";
import {
  DEFAULT_TODO_CHART_KEYS,
  DEFAULT_TODO_FILTER_KEYS,
  DEFAULT_TODO_HEADER_STAT_KEYS,
  DEFAULT_TODO_KPI_KEYS,
  TODO_CHART_DEFS,
  TODO_FILTER_DEFS,
  TODO_HEADER_STAT_DEFS,
  TODO_KPI_DEFS,
} from "../todo/todo-display-prefs";
import { patchTodoHubPrefs, readTodoHubPrefs } from "../todo/todo-tab-prefs";
import {
  DEFAULT_TWOFA_CHART_KEYS,
  DEFAULT_TWOFA_HEADER_STAT_KEYS,
  DEFAULT_TWOFA_KPI_KEYS,
  TWOFA_CHART_DEFS,
  TWOFA_HEADER_STAT_DEFS,
  TWOFA_KPI_DEFS,
} from "../twofa/twofa-display-prefs";
import { patchTwofaHubPrefs, readTwofaHubPrefs } from "../twofa/twofa-tab-prefs";
import { DEFAULT_TWOFA_FILTER_KEYS, TWOFA_FILTER_DEFS } from "../twofa/twofa-filter-defs";
import {
  countHiddenTwofaTableColumns,
  TwofaTableColumnsSettings,
} from "../twofa/TwofaTableColumnsSettings";
import { TwofaTableColumnsResetAction } from "../twofa/TwofaTableColumnsResetAction";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { patchHubListPrefs, readHubListPrefs } from "../../lib/url-prefs";

type WorkspaceDisplayPanelOpts = {
  screen: WorkspaceScreen;
  screenFilters?: FilterDef[];
};

/** Tab display panel — KPI · charts · header · filters · table columns. */
export function useWorkspaceDisplayPanelConfig({
  screen,
  screenFilters = [],
}: WorkspaceDisplayPanelOpts): HubDirectoryDisplayPanelProps | null {
  const [hiddenTwofaCols, setHiddenTwofaCols] = useState(() =>
    screen === "twofa" ? countHiddenTwofaTableColumns() : 0,
  );

  useEffect(() => {
    if (screen !== "twofa") return;
    const sync = () => setHiddenTwofaCols(countHiddenTwofaTableColumns());
    window.addEventListener("twofa-table-columns-change", sync);
    return () => window.removeEventListener("twofa-table-columns-change", sync);
  }, [screen]);

  if (screen === "cookie") {
    const filters = screenFilters.length
      ? screenFilters.map(({ key, label }) => ({ key, label }))
      : COOKIE_FILTER_DEFS;
    const defaultFilterKeys = stripLegacyCookieFilterKeys(
      screenFilters.length
        ? new Set(screenFilters.map((f) => f.key))
        : DEFAULT_COOKIE_ROUTE_FILTER_KEYS,
    ) ?? DEFAULT_COOKIE_ROUTE_FILTER_KEYS;

    return {
      kpis: COOKIE_KPI_DEFS,
      charts: COOKIE_CHART_DEFS,
      filters,
      defaultKpiKeys: DEFAULT_COOKIE_KPI_KEYS,
      defaultChartKeys: DEFAULT_COOKIE_CHART_KEYS,
      defaultFilterKeys,
      filterParam: "cfilt",
      filtersFromUrl: true,
      headerStats: COOKIE_HEADER_STAT_DEFS,
      defaultHeaderStatKeys: DEFAULT_COOKIE_HEADER_STAT_KEYS,
      headerStatLabel: () => "Cookie header",
      readPrefs: readCookieHubPrefs,
      patchPrefs: patchCookieHubPrefs,
      getScreen: () => screen,
      onLog: (scope, message) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("hub-app-log", { detail: { scope, message } }));
      },
    };
  }

  if (screen === "notes" || screen === "edit") {
    return {
      filters: NOTES_FILTER_PREF_DEFS,
      defaultFilterKeys: DEFAULT_NOTES_FILTER_KEYS,
      filterParam: "nfilt",
      filtersFromUrl: true,
      headerStats: NOTES_HEADER_STAT_DEFS,
      defaultHeaderStatKeys: DEFAULT_NOTES_HEADER_STAT_KEYS,
      headerStatLabel: () => "Notes header",
      readPrefs: readHubListPrefs,
      patchPrefs: (patch) => patchHubListPrefs(patch),
      getScreen: () => "notes",
      onLog: (scope, message) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("hub-app-log", { detail: { scope, message } }));
      },
    };
  }

  if (screen === "twofa") {
    const filters = screenFilters.length
      ? screenFilters.map(({ key, label }) => ({ key, label }))
      : TWOFA_FILTER_DEFS;
    const tablePanel: ReactNode = <TwofaTableColumnsSettings />;

    return {
      kpis: TWOFA_KPI_DEFS,
      charts: TWOFA_CHART_DEFS,
      filters,
      defaultKpiKeys: DEFAULT_TWOFA_KPI_KEYS,
      defaultChartKeys: DEFAULT_TWOFA_CHART_KEYS,
      defaultFilterKeys: DEFAULT_TWOFA_FILTER_KEYS,
      filterParam: "afilt",
      filtersFromUrl: true,
      headerStats: TWOFA_HEADER_STAT_DEFS,
      defaultHeaderStatKeys: DEFAULT_TWOFA_HEADER_STAT_KEYS,
      headerStatLabel: () => "2FA header",
      tablePanel,
      tableSectionActions: <TwofaTableColumnsResetAction />,
      tableActiveCount: hiddenTwofaCols,
      readPrefs: readTwofaHubPrefs,
      patchPrefs: patchTwofaHubPrefs,
      getScreen: () => screen,
      onLog: (scope, message) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("hub-app-log", { detail: { scope, message } }));
      },
    };
  }

  if (screen === "todo") {
    const filters = screenFilters.length
      ? screenFilters.map(({ key, label }) => ({ key, label }))
      : TODO_FILTER_DEFS;
    const defaultFilterKeys = screenFilters.length
      ? new Set(screenFilters.map((f) => f.key))
      : DEFAULT_TODO_FILTER_KEYS;

    return {
      kpis: TODO_KPI_DEFS,
      charts: TODO_CHART_DEFS,
      filters,
      defaultKpiKeys: DEFAULT_TODO_KPI_KEYS,
      defaultChartKeys: DEFAULT_TODO_CHART_KEYS,
      defaultFilterKeys,
      filterParam: "tfilt",
      filtersFromUrl: true,
      headerStats: TODO_HEADER_STAT_DEFS,
      defaultHeaderStatKeys: DEFAULT_TODO_HEADER_STAT_KEYS,
      headerStatLabel: () => "Todo header",
      readPrefs: readTodoHubPrefs,
      patchPrefs: patchTodoHubPrefs,
      getScreen: () => screen,
      onLog: (scope, message) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("hub-app-log", { detail: { scope, message } }));
      },
    };
  }

  if (screen === "sheet") {
    return {
      headerStats: SHEET_HEADER_STAT_DEFS,
      defaultHeaderStatKeys: DEFAULT_SHEET_HEADER_STAT_KEYS,
      headerStatLabel: () => "Sheet header",
      readPrefs: readHubListPrefs,
      patchPrefs: (patch) => patchHubListPrefs(patch),
      getScreen: () => screen,
      onLog: (scope, message) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("hub-app-log", { detail: { scope, message } }));
      },
    };
  }

  if (screen === "system") {
    return {
      headerStatLabel: () => "System header",
      readPrefs: readHubListPrefs,
      patchPrefs: (patch) => patchHubListPrefs(patch),
      getScreen: () => screen,
      onLog: (scope, message) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(new CustomEvent("hub-app-log", { detail: { scope, message } }));
      },
    };
  }

  return null;
}
