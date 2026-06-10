import { createContext, useContext, useState, type ReactNode } from "react";
import type { FilterDef, KpiTileData } from "@tool-workspace/hub-ui";
import type { TimeRange } from "@/todo/components/PerformanceSummary";
import type { TodoChartData } from "@/todo/todo-charts";
import type { TodoFilters } from "@/todo/todo-filters";

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
  filterRowLeading: ReactNode;
  setFilterRowLeading: (node: ReactNode) => void;
  kpis: KpiTileData[] | undefined;
  setKpis: (kpis: KpiTileData[] | undefined) => void;
  chartData: TodoChartData | null;
  setChartData: (data: TodoChartData | null) => void;
  sectionRuleLabel: string | undefined;
  setSectionRuleLabel: (label: string | undefined) => void;
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
  const [filters, setFilters] = useState<TodoFilters>(defaultFilters);
  const [filterDefs, setFilterDefs] = useState<FilterDef[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>("last30Days");
  const [customMonth, setCustomMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [directoryToolbar, setDirectoryToolbar] = useState<ReactNode>(null);
  const [filterRowLeading, setFilterRowLeading] = useState<ReactNode>(null);
  const [kpis, setKpis] = useState<KpiTileData[] | undefined>(undefined);
  const [chartData, setChartData] = useState<TodoChartData | null>(null);
  const [sectionRuleLabel, setSectionRuleLabel] = useState<string | undefined>("Board");

  return (
    <TodoChromeContext.Provider
      value={{
        filters,
        setFilters,
        filterDefs,
        setFilterDefs,
        timeRange,
        setTimeRange,
        customMonth,
        setCustomMonth,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        directoryToolbar,
        setDirectoryToolbar,
        filterRowLeading,
        setFilterRowLeading,
        kpis,
        setKpis,
        chartData,
        setChartData,
        sectionRuleLabel,
        setSectionRuleLabel,
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
  filterRowLeading: null,
  setFilterRowLeading: () => {},
  kpis: undefined,
  setKpis: () => {},
  chartData: null,
  setChartData: () => {},
  sectionRuleLabel: undefined,
  setSectionRuleLabel: () => {},
};

export function useTodoChrome() {
  return useContext(TodoChromeContext) ?? noop;
}
