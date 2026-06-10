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
  HubScreenChunkFallback,
  type HubScreenChunkFallbackProps,
  HubLoaderRoot,
  HUB_TAB_LOADER_ROOT_ID,
  resolveVisibleKpiKeys,
  useResolvedVisibleKpiKeys,
  defaultKpiKeysFromDefs,
  MAX_VISIBLE_KPI,
  HubTimeRangeSelect,
  HubRowLimitSelect,
} from "@tool-workspace/hub-ui";

export { HubWorkspacePeriodSelect } from "./HubWorkspacePeriodSelect";

export { DisplayPrefs, type PrefItem } from "./DisplayPrefs";
export { WorkspaceSidebar } from "./WorkspaceSidebar";
export {
  WorkspaceLoadingView,
  WORKSPACE_LOADING_PRESETS,
} from "./HubLoadingView";
