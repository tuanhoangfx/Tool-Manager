import { createContext, useContext, useState, type ReactNode } from "react";
import type { FilterDef, KpiTileData } from "@tool-workspace/hub-ui";
import type { TimeRange } from "./components/PerformanceSummary";
import type { TodoChartData } from "./todo-charts";
import type { TodoFilters } from "./todo-filters";
import { useWorkspacePeriod } from "../../lib/use-workspace-period";

type Ctx = {
  filters: TodoFilters;
  setFilters: React.Dispatch<React.SetStateAction<TodoFilters>>;
  filterDefs: FilterDef[];
  setFilterDefs: (defs: FilterDef[]) => void;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  customMonth: string;
  setCustomMonth: (m: string) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  directoryToolbar: ReactNode;
  setDirectoryToolbar: (node: ReactNode) => void;
  filterToolbarLeading: ReactNode;
  setFilterToolbarLeading: (node: ReactNode) => void;
  filterRowLeading: ReactNode;
  setFilterRowLeading: (node: ReactNode) => void;
  kpis: KpiTileData[] | undefined;
  setKpis: (kpis: KpiTileData[] | undefined) => void;
  chartData: TodoChartData | null;
  setChartData: (data: TodoChartData | null) => void;
  sectionRuleLabel: string | undefined;
  setSectionRuleLabel: (label: string | undefined) => void;
  usersDirectoryWarning: string | null;
  setUsersDirectoryWarning: (message: string | null) => void;
  settingsExtras: ReactNode;
  setSettingsExtras: (node: ReactNode) => void;
  settingsFooterActions: ReactNode;
  setSettingsFooterActions: (node: ReactNode) => void;
};

const TodoChromeContext = createContext<Ctx | null>(null);

const defaultFilters: TodoFilters = {
  searchTerm: "",
  creatorIds: [],
  priorities: [],
  dueDates: [],
  projectIds: [],
};

export function TodoChromeProvider({ children }: { children: ReactNode }) {
  const period = useWorkspacePeriod("todo", "last30Days");
  const [filters, setFilters] = useState<TodoFilters>(defaultFilters);
  const [filterDefs, setFilterDefs] = useState<FilterDef[]>([]);
  const [directoryToolbar, setDirectoryToolbar] = useState<ReactNode>(null);
  const [filterToolbarLeading, setFilterToolbarLeading] = useState<ReactNode>(null);
  const [filterRowLeading, setFilterRowLeading] = useState<ReactNode>(null);
  const [kpis, setKpis] = useState<KpiTileData[] | undefined>(undefined);
  const [chartData, setChartData] = useState<TodoChartData | null>(null);
  const [sectionRuleLabel, setSectionRuleLabel] = useState<string | undefined>("Board");
  const [usersDirectoryWarning, setUsersDirectoryWarning] = useState<string | null>(null);
  const [settingsExtras, setSettingsExtras] = useState<ReactNode>(null);
  const [settingsFooterActions, setSettingsFooterActions] = useState<ReactNode>(null);

  return (
    <TodoChromeContext.Provider
      value={{
        filters,
        setFilters,
        filterDefs,
        setFilterDefs,
        timeRange: period.range as TimeRange,
        setTimeRange: (r) => period.patch({ range: r }),
        customMonth: period.customMonth,
        setCustomMonth: period.setCustomMonth,
        customStartDate: period.customStartDate,
        setCustomStartDate: period.setCustomStartDate,
        customEndDate: period.customEndDate,
        setCustomEndDate: period.setCustomEndDate,
        directoryToolbar,
        setDirectoryToolbar,
        filterToolbarLeading,
        setFilterToolbarLeading,
        filterRowLeading,
        setFilterRowLeading,
        kpis,
        setKpis,
        chartData,
        setChartData,
        sectionRuleLabel,
        setSectionRuleLabel,
        usersDirectoryWarning,
        setUsersDirectoryWarning,
        settingsExtras,
        setSettingsExtras,
        settingsFooterActions,
        setSettingsFooterActions,
      }}
    >
      {children}
    </TodoChromeContext.Provider>
  );
}

const noop: Ctx = {
  filters: defaultFilters,
  setFilters: () => {},
  filterDefs: [],
  setFilterDefs: () => {},
  timeRange: "last30Days",
  setTimeRange: () => {},
  customMonth: "",
  setCustomMonth: () => {},
  customStartDate: "",
  setCustomStartDate: () => {},
  customEndDate: "",
  setCustomEndDate: () => {},
  directoryToolbar: null,
  setDirectoryToolbar: () => {},
  filterToolbarLeading: null,
  setFilterToolbarLeading: () => {},
  filterRowLeading: null,
  setFilterRowLeading: () => {},
  kpis: undefined,
  setKpis: () => {},
  chartData: null,
  setChartData: () => {},
  sectionRuleLabel: undefined,
  setSectionRuleLabel: () => {},
  usersDirectoryWarning: null,
  setUsersDirectoryWarning: () => {},
  settingsExtras: null,
  setSettingsExtras: () => {},
  settingsFooterActions: null,
  setSettingsFooterActions: () => {},
};

export function useTodoChrome() {
  return useContext(TodoChromeContext) ?? noop;
}
