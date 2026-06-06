/** Hub shell primitives — canonical @tool-workspace/hub-ui (P0004 golden pattern). */
export {
  AppTabHeader,
  type TabHeaderMetaItem,
  type TabHeaderStatItem,
  FilterBar,
  HubSingleFilterDropdown,
  type FilterDef,
  type FilterOption,
  type FilterValues,
  type HubSingleFilterDropdownProps,
  MetricBadge,
  RegistryMetricBadge,
  type MetricBadgeProps,
  type MetricBadgeTone,
  KpiStrip,
  type KpiTileData,
  MiniBarChart,
  type BarItem,
  MiniDonut,
  type DonutItem,
  ViewToggle,
  type HubViewMode,
  HubResultCount,
  HubLoadingView,
  type HubLoadingViewProps,
  HubLoaderRoot,
  HUB_TAB_LOADER_ROOT_ID,
  resolveVisibleKpiKeys,
  defaultKpiKeysFromDefs,
  MAX_VISIBLE_KPI,
} from "@tool-workspace/hub-ui";

export { DisplayPrefs, type PrefItem } from "./DisplayPrefs";
export { WorkspaceSidebar } from "./WorkspaceSidebar";
export { HubSortLabel } from "./HubSortLabel";
export { HubTimeRangeSelect } from "./HubTimeRangeSelect";
export { HubRowLimitSelect } from "./HubRowLimitSelect";
export {
  WorkspaceLoadingView,
  WORKSPACE_LOADING_PRESETS,
} from "./HubLoadingView";
