import type { BarItem } from "@tool-workspace/hub-ui";
import type { Task } from "./types";

export type TodoChartData = {
  statusItems: BarItem[];
  priorityItems: BarItem[];
};

export function buildTodoChartItems(tasks: Task[]): TodoChartData {
  const status = {
    todo: 0,
    inprogress: 0,
    done: 0,
    cancelled: 0,
  };
  const priority = { low: 0, medium: 0, high: 0 };

  for (const task of tasks) {
    status[task.status] += 1;
    priority[task.priority] += 1;
  }

  return {
    statusItems: [
      { label: "To Do", value: status.todo, color: "#f59e0b" },
      { label: "In Progress", value: status.inprogress, color: "#6366f1" },
      { label: "Done", value: status.done, color: "#22c55e" },
      { label: "Cancelled", value: status.cancelled, color: "#f43f5e" },
    ],
    priorityItems: [
      { label: "Low", value: priority.low, color: "#22c55e" },
      { label: "Medium", value: priority.medium, color: "#f59e0b" },
      { label: "High", value: priority.high, color: "#f43f5e" },
    ],
  };
}
