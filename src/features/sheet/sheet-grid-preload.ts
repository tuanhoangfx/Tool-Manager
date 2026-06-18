import { parseCsvToGrid } from "./sheet-csv-grid";
import { writeSheetGridCache } from "./sheet-grid-cache";
import type { SheetGridData } from "./sheet-grid-types";
import type { SheetSource } from "./sheet-sources";

const inflight = new Map<string, Promise<SheetGridData | null>>();

async function fetchSheetGrid(source: SheetSource): Promise<SheetGridData | null> {
  const res = await fetch(source.csvUrl, { method: "GET" });
  if (!res.ok) return null;
  const csv = await res.text();
  const trimmed = csv.trimStart();
  if (trimmed.startsWith("<!") || /^<html[\s>]/i.test(trimmed)) return null;
  const { grid } = parseCsvToGrid(csv, { headerRowIndex: source.headerRowIndex });
  writeSheetGridCache(source.id, grid);
  return grid;
}

/** Prefetch sheet CSV into session cache (hover / adjacent row). */
export function prefetchSheetGrid(
  source: SheetSource | null | undefined,
  onCached?: (sheetId: string, grid: SheetGridData) => void,
): void {
  if (!source?.csvUrl) return;
  if (inflight.has(source.id)) return;
  const job = fetchSheetGrid(source)
    .then((grid) => {
      if (grid) onCached?.(source.id, grid);
      return grid;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(source.id);
    });
  inflight.set(source.id, job);
}

export function prefetchAdjacentSheetGrids(
  sources: SheetSource[],
  activeId: string | null,
  onCached?: (sheetId: string, grid: SheetGridData) => void,
): void {
  if (!activeId || sources.length < 2) return;
  const index = sources.findIndex((s) => s.id === activeId);
  if (index < 0) return;
  if (index > 0) prefetchSheetGrid(sources[index - 1], onCached);
  if (index < sources.length - 1) prefetchSheetGrid(sources[index + 1], onCached);
}
