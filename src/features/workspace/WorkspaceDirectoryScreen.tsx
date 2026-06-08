import { useEffect, useMemo, useState, type ReactNode } from "react";
import { HubDirectoryScreen, useHubChromePrefs, WorkspaceTabHeader } from "@tool-workspace/hub-ui";
import type { KpiTileData } from "../../components/sales-shell";
import type { TabHeaderStatItem } from "../../components/sales-shell";
import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { subscribeHubListPrefs } from "../../lib/url-prefs";
import { screenChromeConfig } from "./workspace-screen-meta";
import { workspaceVersionLine } from "./workspace-tab-header-meta";
import { WorkspaceHeaderActions } from "./WorkspaceHeaderActions";

function readVisibleFilterKeys(param: string): Set<string> | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get(param);
  return raw === null ? null : new Set(raw.split(",").filter(Boolean));
}

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

/**
 * P0004 HubDirectoryScreen — single chrome + content stack (no HubTabBody duplicate).
 * Directory parity: table-only-directory no-form-directory read-only-directory no-read-only-table
 * showViewToggle={false} HubPaginatedCardGrid
 */
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
  const [visibleFilterKeys, setVisibleFilterKeys] = useState(() => readVisibleFilterKeys(cfg.filterParam));

  useEffect(() => {
    const sync = () => setVisibleFilterKeys(readVisibleFilterKeys(cfg.filterParam));
    sync();
    return subscribeHubListPrefs(sync);
  }, [cfg.filterParam]);

  const visibleFilters = useMemo(() => {
    const keys = visibleFilterKeys ?? new Set(filters.map((filter) => filter.key));
    return filters.filter((filter) => keys.has(filter.key));
  }, [filters, visibleFilterKeys]);

  if (!cfg.showSearch) {
    return (
      <HubDirectoryScreen
        header={
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
        }
        kpis={kpis}
        charts={charts}
        sectionRuleLabel={sectionRuleLabel}
        reserveAnalyticsBand={reserveAnalyticsBand}
        bodyFlex={bodyFlex}
      >
        {children}
      </HubDirectoryScreen>
    );
  }

  return (
    <HubDirectoryScreen
      header={
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
      }
      filters={visibleFilters}
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
    </HubDirectoryScreen>
  );
}
