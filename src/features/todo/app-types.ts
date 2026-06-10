/** Shared types for Todo orchestration (TodoAppCore, hooks, realtime). */

export type DataChange = {
  type: "add" | "update" | "delete" | "delete_many" | "batch_update" | "profile_change";
  payload: unknown;
  timestamp: number;
};

export interface TaskCounts {
  todo: number;
  inprogress: number;
  done: number;
}

export type TodoAdminView = "myTasks" | "taskDashboard";

/** @deprecated Use TodoAdminView */
export type AdminView = TodoAdminView;
