import { useEffect } from "react";
import type { FilterDef } from "@tool-workspace/hub-ui";
import type { ReactNode } from "react";
import type { Task } from "@/todo/types";
import type { Profile, Project } from "@/todo/types";
import { useSettings } from "@/todo/context/SettingsContext";
import { useTodoChrome } from "@/todo/TodoChromeContext";
import { buildTodoFilterDefs } from "@/todo/todo-filters";
import { buildTodoKpis } from "@/todo/todo-kpi";
import { buildTodoChartItems } from "@/todo/todo-charts";

type SyncArgs = {
  projects: Project[];
  allUsers: Profile[];
  timeFilteredTasks: Task[];
  directoryToolbar?: ReactNode;
  filterRowLeading?: ReactNode;
  sectionRuleLabel?: string;
};

/** Push filter defs + KPI strip from active dashboard into TodoHubChrome (golden directory sync). */
export function useSyncTodoChrome({
  projects,
  allUsers,
  timeFilteredTasks,
  directoryToolbar,
  filterRowLeading,
  sectionRuleLabel = "Board",
}: SyncArgs) {
  const { t } = useSettings();
  const chrome = useTodoChrome();

  useEffect(() => {
    chrome.setDirectoryToolbar(directoryToolbar ?? null);
  }, [directoryToolbar, chrome.setDirectoryToolbar]);

  useEffect(() => {
    chrome.setFilterRowLeading(filterRowLeading ?? null);
  }, [filterRowLeading, chrome.setFilterRowLeading]);

  useEffect(() => {
    chrome.setSectionRuleLabel(sectionRuleLabel);
  }, [sectionRuleLabel, chrome.setSectionRuleLabel]);

  useEffect(() => {
    const defs: FilterDef[] = buildTodoFilterDefs(projects, allUsers, t);
    chrome.setFilterDefs(defs);
  }, [projects, allUsers, t, chrome.setFilterDefs]);

  useEffect(() => {
    chrome.setKpis(buildTodoKpis(timeFilteredTasks, t));
  }, [timeFilteredTasks, t, chrome.setKpis]);

  useEffect(() => {
    chrome.setChartData(buildTodoChartItems(timeFilteredTasks));
  }, [timeFilteredTasks, chrome.setChartData]);
}
