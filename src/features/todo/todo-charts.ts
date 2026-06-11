import type { BarItem } from "@tool-workspace/hub-ui";
import type { Task } from "./types";
import { TODO_PRIORITY_HEX, TODO_STATUS_HEX } from "./todo-visual-tokens";

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
      { label: "To Do", value: status.todo, color: TODO_STATUS_HEX.todo },
      { label: "In Progress", value: status.inprogress, color: TODO_STATUS_HEX.inprogress },
      { label: "Done", value: status.done, color: TODO_STATUS_HEX.done },
      { label: "Cancelled", value: status.cancelled, color: TODO_STATUS_HEX.cancelled },
    ].filter((row) => row.value > 0),
    priorityItems: [
      { label: "Low", value: priority.low, color: TODO_PRIORITY_HEX.low },
      { label: "Medium", value: priority.medium, color: TODO_PRIORITY_HEX.medium },
      { label: "High", value: priority.high, color: TODO_PRIORITY_HEX.high },
    ].filter((row) => row.value > 0),
  };
}
