import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

const OVERSCAN = 8;
const VIRTUAL_THRESHOLD = 48;

export const NOTES_LIST_ROW_HEIGHT: Record<"compact" | "comfortable", number> = {
  compact: 38,
  comfortable: 46,
};

export function useNotesListVirtualWindow<T>(items: T[], rowHeight: number) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const enabled = items.length >= VIRTUAL_THRESHOLD;
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
    const start = Math.max(0, Math.floor(el.scrollTop / rowHeight) - OVERSCAN);
    const count = Math.ceil(el.clientHeight / rowHeight) + OVERSCAN * 2;
    const end = Math.min(items.length, start + count);
    setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, [enabled, items.length, rowHeight]);

  useLayoutEffect(() => {
    update();
  }, [items.length, rowHeight, enabled, update]);

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
        if (isIndexInScrollView(el, index, rowHeight)) return;
        scrollIndexToView(el, index, rowHeight, behavior);
        return;
      }

      const row = el.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(noteId)}"]`);
      row?.scrollIntoView({ block: "nearest", behavior });
    },
    [enabled, items.length, rowHeight],
  );

  return {
    scrollRef,
    enabled,
    visible,
    totalHeight: enabled ? items.length * rowHeight : undefined,
    offsetY: enabled ? range.start * rowHeight : 0,
    scrollNoteIntoView,
  };
}

function isIndexInScrollView(
  el: HTMLElement,
  index: number,
  rowHeight: number,
  margin = 6,
): boolean {
  const rowTop = index * rowHeight;
  const rowBottom = rowTop + rowHeight;
  const viewTop = el.scrollTop;
  const viewBottom = viewTop + el.clientHeight;
  return rowTop >= viewTop + margin && rowBottom <= viewBottom - margin;
}

function scrollIndexToView(
  el: HTMLElement,
  index: number,
  rowHeight: number,
  behavior: ScrollBehavior,
  margin = 6,
) {
  const rowTop = index * rowHeight;
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
