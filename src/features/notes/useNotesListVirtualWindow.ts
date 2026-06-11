import { useCallback } from "react";
import {
  isVirtualIndexInView,
  scrollVirtualIndexIntoView,
  useVirtualWindow,
  virtualWindowContentHeight,
  virtualWindowStride,
} from "@dev/hub-load";

const VIRTUAL_THRESHOLD = 48;

/** Tailwind `space-y-0.5` between list rows */
export const NOTES_LIST_ROW_GAP = 2;

export const NOTES_LIST_ROW_HEIGHT: Record<"compact" | "comfortable", number> = {
  compact: 40,
  comfortable: 48,
};

export function notesListScrollStride(rowHeight: number): number {
  return virtualWindowStride(rowHeight, NOTES_LIST_ROW_GAP);
}

export function notesListContentHeight(count: number, rowHeight: number): number {
  return virtualWindowContentHeight(count, rowHeight, NOTES_LIST_ROW_GAP);
}

export function useNotesListVirtualWindow<T>(items: T[], rowHeight: number) {
  const { scrollRef, enabled, visible, offsetY, totalHeight, stride } = useVirtualWindow(items, {
    threshold: VIRTUAL_THRESHOLD,
    overscan: 8,
    rowHeight,
    rowGap: NOTES_LIST_ROW_GAP,
    layout: "offset",
    initialVisible: 32,
  });

  const scrollNoteIntoView = useCallback(
    (noteId: string, index: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el || index < 0 || index >= items.length) return;

      if (enabled) {
        if (isVirtualIndexInView(el, index, rowHeight, stride)) return;
        scrollVirtualIndexIntoView(el, index, rowHeight, stride, behavior);
        return;
      }

      const row = el.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(noteId)}"]`);
      row?.scrollIntoView({ block: "nearest", behavior });
    },
    [enabled, items.length, rowHeight, scrollRef, stride],
  );

  return {
    scrollRef,
    enabled,
    visible,
    totalHeight,
    offsetY,
    scrollNoteIntoView,
  };
}
