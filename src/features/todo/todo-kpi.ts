import { ClipboardList, Clock } from "lucide-react";
import type { KpiTileData } from "@tool-workspace/hub-ui";
import { TodoCancelledIcon, TodoDoneIcon, TodoInProgressIcon, TodoTodoIcon } from "./todo-icons";
import type { Task } from "./types";
import type { Translation } from "./types";

function avgCompletionLabel(tasks: Task[]): string {
  const doneTasks = tasks.filter((t) => t.status === "done");
  if (doneTasks.length === 0) return "N/A";

  const totalTime = doneTasks.reduce((acc, task) => {
    const created = new Date(task.created_at).getTime();
    const completed = new Date(task.updated_at).getTime();
    return acc + (completed - created);
  }, 0);

  const avgTimeMs = totalTime / doneTasks.length;
  if (avgTimeMs < 0) return "N/A";

  const days = Math.floor(avgTimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((avgTimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((avgTimeMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Golden KPI strip — replaces legacy PerformanceSummary StatCard grid. */
export function buildTodoKpis(tasks: Task[], t: Translation): KpiTileData[] {
  const stats = {
    total: tasks.length,
    todo: tasks.filter((x) => x.status === "todo").length,
    inprogress: tasks.filter((x) => x.status === "inprogress").length,
    done: tasks.filter((x) => x.status === "done").length,
    cancelled: tasks.filter((x) => x.status === "cancelled").length,
  };

  return [
    { prefKey: "total", label: t.totalTasks, value: stats.total, icon: ClipboardList, tone: "blue" },
    { prefKey: "todo", label: t.todo, value: stats.todo, icon: TodoTodoIcon, tone: "amber" },
    { prefKey: "inprogress", label: t.inprogress, value: stats.inprogress, icon: TodoInProgressIcon, tone: "indigo" },
    { prefKey: "done", label: t.done, value: stats.done, icon: TodoDoneIcon, tone: "emerald" },
    { prefKey: "cancelled", label: t.cancelled, value: stats.cancelled, icon: TodoCancelledIcon, tone: "rose" },
    {
      prefKey: "avg_time",
      label: t.avgCompletionTime,
      value: avgCompletionLabel(tasks),
      icon: Clock,
      tone: "purple",
    },
  ];
}
