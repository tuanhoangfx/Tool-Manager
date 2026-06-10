import { lazy, Suspense } from "react";
import type { Task } from "@/todo/types";
import type { CalendarSortState } from "@/todo/lib/calendar-types";
import { TaskBoardSkeleton } from "@/todo/components/Skeleton";

const CalendarViewLazy = lazy(() => import("@/todo/components/CalendarView"));

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
