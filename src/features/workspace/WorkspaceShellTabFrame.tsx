import { useState, type ReactNode } from "react";
import type { HubDirectoryToolbarSelectionProps, HubViewMode } from "@tool-workspace/hub-ui";
import type { KpiTileData, TabHeaderStatItem } from "../../components/sales-shell";
import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";
import { WorkspaceDirectoryScreen } from "./WorkspaceDirectoryScreen";
import { WorkspaceSearchProvider } from "./WorkspaceSearchContext";
import { screenChromeConfig } from "./workspace-screen-meta";

type Props = {
  screen: WorkspaceNavScreen;
  active: boolean;
  children: ReactNode;
  filterShortcutScope?: string;
  bodyFlex?: boolean;
};

/** Per-tab shell — P0004 HubDirectoryScreen (header + FilterBar + KPI/charts + body). */
export function WorkspaceShellTabFrame({
  screen,
  active,
  children,
  filterShortcutScope,
  bodyFlex = false,
}: Props) {
  const scope = filterShortcutScope ?? screen;
  const [query, setQuery] = useState("");
  const [screenFilters, setScreenFilters] = useState<FilterDef[]>([]);
  const [screenFilterValues, setScreenFilterValues] = useState<FilterValues>({});
  const [screenToolbar, setScreenToolbar] = useState<ReactNode>(null);
  const [screenFilterSelectionToolbar, setScreenFilterSelectionToolbar] = useState<
    HubDirectoryToolbarSelectionProps | undefined
  >(undefined);
  const [screenDirectoryViewMode, setScreenDirectoryViewMode] = useState<HubViewMode | undefined>(
    undefined,
  );
  const [screenFilterToolbar, setScreenFilterToolbar] = useState<ReactNode>(null);
  const [screenCenterStats, setScreenCenterStats] = useState<TabHeaderStatItem[]>([]);
  const [directoryKpis, setDirectoryKpis] = useState<KpiTileData[] | undefined>(undefined);
  const [directoryCharts, setDirectoryCharts] = useState<ReactNode>(null);
  const [sectionRuleLabel, setSectionRuleLabel] = useState<string | undefined>(undefined);
  const reserveAnalyticsBand = Boolean(screenChromeConfig(screen).directoryBand);

  return (
    <div
      hidden={!active}
      className={active ? "flex min-h-0 min-w-0 flex-1 flex-col" : "hidden"}
      aria-hidden={!active}
    >
      <WorkspaceSearchProvider
        query={query}
        setQuery={setQuery}
        filters={screenFilters}
        setFilters={setScreenFilters}
        filterValues={screenFilterValues}
        setFilterValues={setScreenFilterValues}
        toolbar={screenToolbar}
        setToolbar={setScreenToolbar}
        filterToolbar={screenFilterToolbar}
        setFilterToolbar={setScreenFilterToolbar}
        filterSelectionToolbar={screenFilterSelectionToolbar}
        setFilterSelectionToolbar={setScreenFilterSelectionToolbar}
        directoryViewMode={screenDirectoryViewMode}
        setDirectoryViewMode={setScreenDirectoryViewMode}
        centerStats={screenCenterStats}
        setCenterStats={setScreenCenterStats}
        directoryKpis={directoryKpis}
        setDirectoryKpis={setDirectoryKpis}
        directoryCharts={directoryCharts}
        setDirectoryCharts={setDirectoryCharts}
        sectionRuleLabel={sectionRuleLabel}
        setSectionRuleLabel={setSectionRuleLabel}
      >
        <WorkspaceDirectoryScreen
          screen={screen}
          query={query}
          onQueryChange={setQuery}
          filters={screenFilters}
          filterValues={screenFilterValues}
          onFilterValuesChange={setScreenFilterValues}
          toolbar={screenToolbar}
          filterSelectionToolbar={screenFilterSelectionToolbar}
          directoryViewMode={screenDirectoryViewMode}
          filterRowActions={screenFilterToolbar}
          centerStats={screenCenterStats}
          filterShortcutScope={scope}
          kpis={directoryKpis}
          charts={directoryCharts}
          sectionRuleLabel={sectionRuleLabel}
          reserveAnalyticsBand={reserveAnalyticsBand}
          bodyFlex={bodyFlex}
        >
          {children}
        </WorkspaceDirectoryScreen>
      </WorkspaceSearchProvider>
    </div>
  );
}
