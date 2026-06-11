import { useEffect, useMemo, type ReactNode } from "react";
import { useSettings } from "../context/SettingsContext";
import { useTodoChrome } from "../TodoChromeContext";
import { buildTodoChartItems } from "../todo-charts";
import { buildTodoFilterDefs } from "../todo-filters";
import { buildTodoKpis } from "../todo-kpi";
import { TodoDirectoryToolbar } from "../todo-directory-toolbar";
import type { Profile, Project, Task } from "../types";

type Props = {
  projects: Project[];
  allUsers: Profile[];
  timeFilteredTasks: Task[];
  shownCount: number;
  totalCount: number;
  filterToolbarLeading?: ReactNode;
  filterRowLeading?: ReactNode;
  sectionRuleLabel?: string;
};

/** Sync board view state into TodoHubChrome (filters, toolbar, KPIs, charts). */
export function useSyncTodoChrome({
  projects,
  allUsers,
  timeFilteredTasks,
  shownCount,
  totalCount,
  filterToolbarLeading,
  filterRowLeading,
  sectionRuleLabel = "Board",
}: Props) {
  const { t } = useSettings();
  const {
    setFilterDefs,
    setDirectoryToolbar,
    setFilterRowLeading,
    setKpis,
    setChartData,
    setSectionRuleLabel,
  } = useTodoChrome();

  const filterDefs = useMemo(() => buildTodoFilterDefs(projects, allUsers, t), [projects, allUsers, t]);
  const kpis = useMemo(() => buildTodoKpis(timeFilteredTasks, t), [timeFilteredTasks, t]);
  const chartData = useMemo(() => buildTodoChartItems(timeFilteredTasks), [timeFilteredTasks]);

  const directoryToolbar = useMemo(
    () => (
      <TodoDirectoryToolbar leading={filterToolbarLeading} shown={shownCount} total={totalCount} />
    ),
    [filterToolbarLeading, shownCount, totalCount],
  );

  useEffect(() => {
    setFilterDefs(filterDefs);
  }, [filterDefs, setFilterDefs]);

  useEffect(() => {
    setDirectoryToolbar(directoryToolbar);
    return () => setDirectoryToolbar(null);
  }, [directoryToolbar, setDirectoryToolbar]);

  useEffect(() => {
    setFilterRowLeading(filterRowLeading ?? null);
    return () => setFilterRowLeading(null);
  }, [filterRowLeading, setFilterRowLeading]);

  useEffect(() => {
    setKpis(kpis);
    return () => setKpis(undefined);
  }, [kpis, setKpis]);

  useEffect(() => {
    setChartData(chartData);
    return () => setChartData(null);
  }, [chartData, setChartData]);

  useEffect(() => {
    setSectionRuleLabel(sectionRuleLabel);
    return () => setSectionRuleLabel(undefined);
  }, [sectionRuleLabel, setSectionRuleLabel]);
}
