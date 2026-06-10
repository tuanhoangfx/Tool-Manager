import type { PrefItem } from "../../components/sales-shell/DisplayPrefs";
import { defaultChartKeysFromDefs, defaultKpiKeysFromDefs } from "@tool-workspace/hub-ui";

export const TODO_KPI_DEFS: PrefItem[] = [
  { key: "total", label: "Total tasks" },
  { key: "todo", label: "To Do" },
  { key: "inprogress", label: "In Progress" },
  { key: "done", label: "Done" },
  { key: "cancelled", label: "Cancelled" },
  { key: "avg_time", label: "Avg. completion time" },
];

export const TODO_CHART_DEFS: PrefItem[] = [
  { key: "status_bar", label: "Tasks by status (bar)" },
  { key: "priority_bar", label: "Tasks by priority (bar)" },
];

export const TODO_FILTER_DEFS: PrefItem[] = [
  { key: "project", label: "Projects" },
  { key: "dueDate", label: "Due Dates" },
  { key: "creator", label: "Creators" },
  { key: "priority", label: "Priorities" },
];

export const TODO_HEADER_STAT_DEFS: PrefItem[] = [
  { key: "todo-stat-todo", label: "To Do" },
  { key: "todo-stat-inprogress", label: "In Progress" },
  { key: "todo-stat-done", label: "Done" },
];

export const TODO_CHART_ORDER = TODO_CHART_DEFS.map((d) => d.key);

export const DEFAULT_TODO_KPI_KEYS = defaultKpiKeysFromDefs(TODO_KPI_DEFS);
export const DEFAULT_TODO_CHART_KEYS = defaultChartKeysFromDefs(TODO_CHART_DEFS);
export const DEFAULT_TODO_FILTER_KEYS = new Set(TODO_FILTER_DEFS.map((f) => f.key));
export const DEFAULT_TODO_HEADER_STAT_KEYS = new Set(TODO_HEADER_STAT_DEFS.map((s) => s.key));
