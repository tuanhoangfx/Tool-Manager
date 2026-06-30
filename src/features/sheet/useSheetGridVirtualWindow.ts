import { useVirtualWindow } from "@dev/hub-load";

export const SHEET_GRID_VIRTUAL_THRESHOLD = 80;

export const SHEET_GRID_ROW_HEIGHT: Record<"wrap" | "truncate", number> = {
  truncate: 36,
  wrap: 48,
};

export function useSheetGridVirtualWindow<T>(
  items: readonly T[],
  rowHeight: number,
) {
  return useVirtualWindow(items, {
    threshold: SHEET_GRID_VIRTUAL_THRESHOLD,
    overscan: 10,
    rowHeight,
    layout: "pad",
    initialVisible: 48,
  });
}
