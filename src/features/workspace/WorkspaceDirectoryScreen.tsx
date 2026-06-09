import { useMemo, type ReactNode } from "react";
import { HubWorkspaceDirectoryScreen, useHubChromePrefs, WorkspaceTabHeader } from "@tool-workspace/hub-ui";
import type { KpiTileData } from "../../components/sales-shell";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { screenChromeConfig } from "./workspace-screen-meta";
import { workspaceVersionLine } from "./workspace-tab-header-meta";
import { WorkspaceHeaderActions } from "./WorkspaceHeaderActions";

type Props = {
  screen: WorkspaceScreen;
  query: string;
  onQueryChange: (q: string) => void;
  toolbar?: ReactNode;
  filterRowActions?: ReactNode;
  centerStats?: TabHeaderStatItem[];
  filters?: FilterDef[];
  filterValues?: FilterValues;
  onFilterValuesChange?: (next: FilterValues) => void;
  filterShortcutScope?: string;
  kpis?: KpiTileData[];
  charts?: ReactNode;
  sectionRuleLabel?: string;
  reserveAnalyticsBand?: boolean;
  bodyFlex?: boolean;
  children: ReactNode;
};

/** P0020 Tier-2 adapter — header meta local; chrome from hub-ui HubWorkspaceDirectoryScreen. */
export function WorkspaceDirectoryScreen({
  screen,
  query,
  onQueryChange,
  toolbar,
  filterRowActions,
  centerStats = [],
  filters = [],
  filterValues = {},
  onFilterValuesChange = () => {},
  filterShortcutScope = "default",
  kpis,
  charts,
  sectionRuleLabel,
  reserveAnalyticsBand = false,
  bodyFlex = false,
  children,
}: Props) {
  const cfg = useMemo(() => screenChromeConfig(screen), [screen]);
  const version = useMemo(() => workspaceVersionLine(), []);
  const { searchPin, headerPin, stackChrome } = useHubChromePrefs();

  const header = (
    <WorkspaceTabHeader
      ariaLabel={cfg.ariaLabel}
      titleIcon={cfg.titleIcon}
      titleIconClass={cfg.titleIconClass}
      title={cfg.title}
      versionLine={version.line}
      versionLive={version.live}
      extraMetaItems={cfg.extraMetaItems}
      centerStats={centerStats}
      actions={<WorkspaceHeaderActions screen={screen} screenFilters={filters} />}
      pinSticky={stackChrome ? false : headerPin}
      dividerBelow={stackChrome ? false : !searchPin}
      embedded={stackChrome}
    />
  );

  return (
    <HubWorkspaceDirectoryScreen
      header={header}
      filterParam={cfg.filterParam}
      showSearch={cfg.showSearch}
      filters={filters}
      query={query}
      onQueryChange={onQueryChange}
      filterValues={filterValues}
      onFilterValuesChange={onFilterValuesChange}
      filterPlaceholder={cfg.searchPlaceholder}
      filterShortcutScope={filterShortcutScope}
      directoryToolbar={toolbar}
      filterRowActions={filterRowActions}
      kpis={kpis}
      charts={charts}
      sectionRuleLabel={sectionRuleLabel}
      reserveAnalyticsBand={reserveAnalyticsBand}
      bodyFlex={bodyFlex}
    >
      {children}
    </HubWorkspaceDirectoryScreen>
  );
}
