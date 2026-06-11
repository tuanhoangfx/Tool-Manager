import { useCallback, useRef, useState } from "react";
import type { Task } from "../types";

type FindTask = (id: number) => Task | undefined;

/** Kanban DnD — dragenter/leave only (no setState per dragover tick). */
export function useKanbanDrag(
  findTask: FindTask,
  onUpdateStatus: (task: Task, status: Task["status"]) => Promise<boolean> | void,
) {
  const draggedIdRef = useRef<number | null>(null);
  const dragOverRef = useRef<Task["status"] | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Task["status"] | null>(null);

  const beginDrag = useCallback((taskId: number) => {
    draggedIdRef.current = taskId;
    setDraggingTaskId(taskId);
  }, []);

  const endDrag = useCallback(() => {
    draggedIdRef.current = null;
    dragOverRef.current = null;
    setDraggingTaskId(null);
    setDragOverStatus(null);
  }, []);

  const enterColumn = useCallback((status: Task["status"]) => {
    if (dragOverRef.current === status) return;
    dragOverRef.current = status;
    setDragOverStatus(status);
  }, []);

  const leaveColumn = useCallback((status: Task["status"], related: EventTarget | null, current: EventTarget) => {
    if (dragOverRef.current !== status) return;
    if (related instanceof Node && current instanceof Node && current.contains(related)) return;
    dragOverRef.current = null;
    setDragOverStatus(null);
  }, []);

  const dropOnColumn = useCallback(
    (status: Task["status"]) => {
      const id = draggedIdRef.current;
      if (id == null) return;
      const task = findTask(id);
      if (task && task.status !== status) {
        void onUpdateStatus(task, status);
      }
      endDrag();
    },
    [endDrag, findTask, onUpdateStatus],
  );

  return {
    draggingTaskId,
    dragOverStatus,
    isDragging: draggingTaskId != null,
    beginDrag,
    endDrag,
    enterColumn,
    leaveColumn,
    dropOnColumn,
  };
}
