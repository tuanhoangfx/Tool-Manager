import { useMemo, type ReactNode } from "react";
import { HubWorkspaceDirectoryScreen, useHubChromePrefs, WorkspaceTabHeader } from "@tool-workspace/hub-ui";
import type { HubDirectoryToolbarSelectionProps, HubViewMode } from "@tool-workspace/hub-ui";
import type { KpiTileData } from "../../components/sales-shell";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { hubTabHeaderChromeProps } from "../../lib/hub-tab-header-chrome";
import { screenChromeConfig } from "./workspace-screen-meta";
import { workspaceVersionLine } from "./workspace-tab-header-meta";
import { WorkspaceHeaderActions } from "./WorkspaceHeaderActions";
import { useTwofaVaultView } from "../twofa/useTwofaVaultView";

type Props = {
  screen: WorkspaceScreen;
  query: string;
  onQueryChange: (q: string) => void;
  toolbar?: ReactNode;
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  directoryViewMode?: HubViewMode;
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
  filterSelectionToolbar,
  directoryViewMode,
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
  const twofaVaultView = useTwofaVaultView();
  const cfg = useMemo(
    () => screenChromeConfig(screen, screen === "twofa" ? twofaVaultView : null),
    [screen, twofaVaultView],
  );
  const version = useMemo(() => workspaceVersionLine(), []);
  const chromePrefs = useHubChromePrefs();
  const headerChrome = hubTabHeaderChromeProps(cfg.showSearch, chromePrefs);

  const header = (
    <WorkspaceTabHeader
      ariaLabel={cfg.ariaLabel}
      titleIcon={cfg.titleIcon}
      titleIconClass={cfg.titleIconClass}
      title={cfg.title}
      versionLine={version.line}
      publishedAt={version.publishedAt}
      versionLive={version.live}
      extraMetaItems={cfg.extraMetaItems}
      centerStats={centerStats}
      actions={<WorkspaceHeaderActions screen={screen} screenFilters={filters} />}
      pinSticky={headerChrome.pinSticky}
      dividerBelow={headerChrome.dividerBelow}
      embedded={headerChrome.embedded}
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
      filterSelectionToolbar={filterSelectionToolbar}
      directoryViewMode={directoryViewMode}
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
