import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

const OVERSCAN = 8;
const VIRTUAL_THRESHOLD = 48;

/** Tailwind `space-y-0.5` between list rows */
export const NOTES_LIST_ROW_GAP = 2;

export const NOTES_LIST_ROW_HEIGHT: Record<"compact" | "comfortable", number> = {
  compact: 40,
  comfortable: 48,
};

export function notesListScrollStride(rowHeight: number): number {
  return rowHeight + NOTES_LIST_ROW_GAP;
}

export function notesListContentHeight(count: number, rowHeight: number): number {
  if (count <= 0) return 0;
  return count * rowHeight + (count - 1) * NOTES_LIST_ROW_GAP;
}

export function useNotesListVirtualWindow<T>(items: T[], rowHeight: number) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const enabled = items.length >= VIRTUAL_THRESHOLD;
  const stride = notesListScrollStride(rowHeight);
  const [range, setRange] = useState(() => ({
    start: 0,
    end: Math.min(items.length, 32),
  }));

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !enabled) {
      setRange({ start: 0, end: items.length });
      return;
    }
    const start = Math.max(0, Math.floor(el.scrollTop / stride) - OVERSCAN);
    const count = Math.ceil(el.clientHeight / stride) + OVERSCAN * 2;
    const end = Math.min(items.length, start + count);
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [enabled, items.length, stride]);

  useLayoutEffect(() => {
    update();
  }, [items.length, stride, enabled, update]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  const visible = useMemo(
    () =>
      items.slice(range.start, range.end).map((item, i) => ({
        item,
        index: range.start + i,
      })),
    [items, range.end, range.start],
  );

  const scrollNoteIntoView = useCallback(
    (noteId: string, index: number, behavior: ScrollBehavior = "smooth") => {
      const el = scrollRef.current;
      if (!el || index < 0 || index >= items.length) return;

      if (enabled) {
        if (isIndexInScrollView(el, index, rowHeight, stride)) return;
        scrollIndexToView(el, index, rowHeight, stride, behavior);
        return;
      }

      const row = el.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(noteId)}"]`);
      row?.scrollIntoView({ block: "nearest", behavior });
    },
    [enabled, items.length, rowHeight, stride],
  );

  return {
    scrollRef,
    enabled,
    visible,
    totalHeight: enabled ? notesListContentHeight(items.length, rowHeight) : undefined,
    offsetY: enabled ? range.start * stride : 0,
    scrollNoteIntoView,
  };
}

function isIndexInScrollView(
  el: HTMLElement,
  index: number,
  rowHeight: number,
  stride: number,
  margin = 6,
): boolean {
  const rowTop = index * stride;
  const rowBottom = rowTop + rowHeight;
  const viewTop = el.scrollTop;
  const viewBottom = viewTop + el.clientHeight;
  return rowTop >= viewTop + margin && rowBottom <= viewBottom - margin;
}

function scrollIndexToView(
  el: HTMLElement,
  index: number,
  rowHeight: number,
  stride: number,
  behavior: ScrollBehavior,
  margin = 6,
) {
  const rowTop = index * stride;
  const rowBottom = rowTop + rowHeight;
  const viewTop = el.scrollTop;
  const viewBottom = viewTop + el.clientHeight;
  if (rowTop >= viewTop + margin && rowBottom <= viewBottom - margin) return;
  if (rowTop < viewTop + margin) {
    el.scrollTo({ top: Math.max(0, rowTop - margin), behavior });
    return;
  }
  el.scrollTo({ top: rowBottom - el.clientHeight + margin, behavior });
}
