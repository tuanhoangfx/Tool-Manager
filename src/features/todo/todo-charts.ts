import { chartBreakdownFromPicker, type ChartRow } from "@tool-workspace/hub-ui";
import { resolveChartLegendIcon } from "../../lib/badge-registry";
import type { Task } from "./types";

const iconFor = resolveChartLegendIcon;

const STATUS_LABEL: Record<Task["status"], string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export type TodoChartData = {
  statusItems: ChartRow[];
  priorityItems: ChartRow[];
};

export function buildTodoChartItems(tasks: Task[]): TodoChartData {
  return {
    statusItems: chartBreakdownFromPicker(tasks, (task) => STATUS_LABEL[task.status], { iconFor }),
    priorityItems: chartBreakdownFromPicker(tasks, (task) => PRIORITY_LABEL[task.priority], { iconFor }),
  };
}
