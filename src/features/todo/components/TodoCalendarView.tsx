import { lazy, Suspense } from "react";
import type { Task } from "../types";
import type { CalendarSortState } from "../lib/calendar-types";
import { TaskBoardSkeleton } from "./Skeleton";

const CalendarViewLazy = lazy(() => import("./CalendarView"));

type Props = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  calendarSort: CalendarSortState;
  onCalendarSortChange: (state: CalendarSortState) => void;
};

/** Lazy wrapper — CalendarView in separate chunk (feature-todo-calendar). */
export function TodoCalendarView(props: Props) {
  return (
    <Suspense fallback={<TaskBoardSkeleton />}>
      <CalendarViewLazy {...props} />
    </Suspense>
  );
}
