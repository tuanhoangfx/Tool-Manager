import type { ReactNode } from "react";
import { CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { SpinnerIcon } from "./components/Icons";
import type { Task } from "./types";
import { TODO_STATUS_HEX } from "./todo-visual-tokens";

type IconProps = { size?: number; className?: string };

function StatusColorWrap({
  color,
  children,
  className = "",
}: {
  color: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex ${className}`.trim()} style={{ color }}>
      {children}
    </span>
  );
}

function todoStatusIcon(status: Task["status"], Icon: typeof ClipboardList, { size = 18, className = "" }: IconProps) {
  return (
    <StatusColorWrap color={TODO_STATUS_HEX[status]} className={className}>
      <Icon size={size} />
    </StatusColorWrap>
  );
}

/** KPI / header icons — hex locked to chart tokens. */
export function TodoTodoIcon(props: IconProps) {
  return todoStatusIcon("todo", ClipboardList, props);
}

export function TodoDoneIcon(props: IconProps) {
  return todoStatusIcon("done", CheckCircle2, props);
}

export function TodoCancelledIcon(props: IconProps) {
  return todoStatusIcon("cancelled", XCircle, props);
}

/** Kanban-aligned in-progress glyph — radial spinner (not lucide Loader2). */
export function TodoInProgressIcon({ size = 18, className = "" }: IconProps) {
  return (
    <StatusColorWrap color={TODO_STATUS_HEX.inprogress} className={className}>
      <SpinnerIcon size={size} className="todo-inprogress-icon animate-spin" />
    </StatusColorWrap>
  );
}
