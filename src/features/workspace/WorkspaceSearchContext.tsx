import { createContext, useContext, type ReactNode } from "react";
import type { HubDirectoryToolbarSelectionProps } from "@tool-workspace/hub-ui";
import type { KpiTileData, TabHeaderStatItem } from "../../components/sales-shell";
import type { FilterDef, FilterValues } from "../../components/sales-shell";

type Ctx = {
  query: string;
  setQuery: (q: string) => void;
  filters: FilterDef[];
  setFilters: (filters: FilterDef[]) => void;
  filterValues: FilterValues;
  setFilterValues: (next: FilterValues) => void;
  toolbar: ReactNode;
  setToolbar: (toolbar: ReactNode) => void;
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  setFilterSelectionToolbar: (toolbar: HubDirectoryToolbarSelectionProps | undefined) => void;
  filterToolbar: ReactNode;
  setFilterToolbar: (toolbar: ReactNode) => void;
  centerStats: TabHeaderStatItem[];
  setCenterStats: (stats: TabHeaderStatItem[]) => void;
  directoryKpis: KpiTileData[] | undefined;
  setDirectoryKpis: (kpis: KpiTileData[] | undefined) => void;
  directoryCharts: ReactNode;
  setDirectoryCharts: (charts: ReactNode) => void;
  sectionRuleLabel: string | undefined;
  setSectionRuleLabel: (label: string | undefined) => void;
};

const WorkspaceSearchContext = createContext<Ctx | null>(null);

export function WorkspaceSearchProvider({
  query,
  setQuery,
  filters,
  setFilters,
  filterValues,
  setFilterValues,
  toolbar,
  setToolbar,
  filterSelectionToolbar,
  setFilterSelectionToolbar,
  filterToolbar,
  setFilterToolbar,
  centerStats,
  setCenterStats,
  directoryKpis,
  setDirectoryKpis,
  directoryCharts,
  setDirectoryCharts,
  sectionRuleLabel,
  setSectionRuleLabel,
  children,
}: {
  query: string;
  setQuery: (q: string) => void;
  filters: FilterDef[];
  setFilters: (filters: FilterDef[]) => void;
  filterValues: FilterValues;
  setFilterValues: (next: FilterValues) => void;
  toolbar: ReactNode;
  setToolbar: (toolbar: ReactNode) => void;
  filterSelectionToolbar?: HubDirectoryToolbarSelectionProps;
  setFilterSelectionToolbar: (toolbar: HubDirectoryToolbarSelectionProps | undefined) => void;
  filterToolbar: ReactNode;
  setFilterToolbar: (toolbar: ReactNode) => void;
  centerStats: TabHeaderStatItem[];
  setCenterStats: (stats: TabHeaderStatItem[]) => void;
  directoryKpis: KpiTileData[] | undefined;
  setDirectoryKpis: (kpis: KpiTileData[] | undefined) => void;
  directoryCharts: ReactNode;
  setDirectoryCharts: (charts: ReactNode) => void;
  sectionRuleLabel: string | undefined;
  setSectionRuleLabel: (label: string | undefined) => void;
  children: ReactNode;
}) {
  return (
    <WorkspaceSearchContext.Provider
      value={{
        query,
        setQuery,
        filters,
        setFilters,
        filterValues,
        setFilterValues,
        toolbar,
        setToolbar,
        filterSelectionToolbar,
        setFilterSelectionToolbar,
        filterToolbar,
        setFilterToolbar,
        centerStats,
        setCenterStats,
        directoryKpis,
        setDirectoryKpis,
        directoryCharts,
        setDirectoryCharts,
        sectionRuleLabel,
        setSectionRuleLabel,
      }}
    >
      {children}
    </WorkspaceSearchContext.Provider>
  );
}

const noopCtx: Ctx = {
  query: "",
  setQuery: () => {},
  filters: [],
  setFilters: () => {},
  filterValues: {},
  setFilterValues: () => {},
  toolbar: null,
  setToolbar: () => {},
  filterSelectionToolbar: undefined,
  setFilterSelectionToolbar: () => {},
  filterToolbar: null,
  setFilterToolbar: () => {},
  centerStats: [],
  setCenterStats: () => {},
  directoryKpis: undefined,
  setDirectoryKpis: () => {},
  directoryCharts: null,
  setDirectoryCharts: () => {},
  sectionRuleLabel: undefined,
  setSectionRuleLabel: () => {},
};

export function useWorkspaceSearch() {
  return useContext(WorkspaceSearchContext) ?? noopCtx;
}
