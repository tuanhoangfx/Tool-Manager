import type { TabHeaderStatItem } from "@tool-workspace/hub-ui";
import type { TaskCounts } from "./app-types";
import type { Task } from "./types";
import { TodoDoneIcon, TodoInProgressIcon, TodoTodoIcon } from "./todo-icons";

type Opts = {
  onStatClick?: (status: Task["status"]) => void;
  activeStatus?: Task["status"] | null;
  visibleKeys?: Set<string>;
};

/** Header center strip — To Do / In Progress / Done (golden AppTabHeader centerStats). */
export function buildTodoHeaderStats(taskCounts: TaskCounts, opts?: Opts): TabHeaderStatItem[] {
  const click = opts?.onStatClick;
  const active = opts?.activeStatus;
  const vis = opts?.visibleKeys ?? new Set(["todo-stat-todo", "todo-stat-inprogress", "todo-stat-done"]);

  const all: TabHeaderStatItem[] = [
    {
      key: "todo-stat-todo",
      icon: TodoTodoIcon,
      label: "To Do",
      value: taskCounts.todo,
      toneClass: "",
      onClick: click ? () => click("todo") : undefined,
      active: active === "todo",
    },
    {
      key: "todo-stat-inprogress",
      icon: TodoInProgressIcon,
      label: "In Progress",
      value: taskCounts.inprogress,
      toneClass: "",
      onClick: click ? () => click("inprogress") : undefined,
      active: active === "inprogress",
    },
    {
      key: "todo-stat-done",
      icon: TodoDoneIcon,
      label: "Done",
      value: taskCounts.done,
      toneClass: "",
      onClick: click ? () => click("done") : undefined,
      active: active === "done",
    },
  ];

  return all.filter((s) => vis.has(s.key));
}
