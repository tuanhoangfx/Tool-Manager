import type { ReactNode } from "react";
import { CheckCircleIcon, ClipboardListIcon, SpinnerIcon, XCircleIcon } from "./components/Icons";
import type { Task } from "./types";
import type { Translation } from "./types";
import { TODO_STATUS_HEX } from "./todo-visual-tokens";

const STATUS_ICONS: Record<Task["status"], typeof ClipboardListIcon> = {
  todo: ClipboardListIcon,
  inprogress: SpinnerIcon,
  done: CheckCircleIcon,
  cancelled: XCircleIcon,
};

export function TodoKanbanStatusIcon({ status, size = 16 }: { status: Task["status"]; size?: number }) {
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex ${status === "inprogress" ? "animate-spin" : ""}`}
      style={{ color: TODO_STATUS_HEX[status] }}
    >
      <Icon size={size} />
    </span>
  );
}

export function todoKanbanStatusConfig(t: Translation): Record<
  Task["status"],
  { icon: ReactNode; title: string }
> {
  return {
    todo: { icon: <TodoKanbanStatusIcon status="todo" />, title: t.todo },
    inprogress: { icon: <TodoKanbanStatusIcon status="inprogress" />, title: t.inprogress },
    done: { icon: <TodoKanbanStatusIcon status="done" />, title: t.done },
    cancelled: { icon: <TodoKanbanStatusIcon status="cancelled" />, title: t.cancelled },
  };
}
