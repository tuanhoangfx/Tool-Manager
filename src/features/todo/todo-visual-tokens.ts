import type { Task } from "./types";

/** Canonical hex — KPI charts (`todo-charts.ts`) and Kanban must match 100%. */
export const TODO_STATUS_HEX: Record<Task["status"], string> = {
  todo: "#f59e0b",
  inprogress: "#6366f1",
  done: "#22c55e",
  cancelled: "#f43f5e",
};

export const TODO_PRIORITY_HEX: Record<Task["priority"], string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f43f5e",
};
