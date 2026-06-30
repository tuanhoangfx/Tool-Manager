import { parseCsvToGrid, shouldLazyParseSheetCsv } from "./sheet-csv-grid";
import { writeSheetGridCache } from "./sheet-grid-cache";
import { writeSheetGridCsvIdb } from "./sheet-grid-idb-cache";
import {
  fetchPricingCatalogGrid,
  isPricingCatalogSource,
  pricingCatalogIdFromSource,
  shouldLoadPricingCatalogGrid,
} from "./pricing-catalog-sheet";
import type { SheetGridData } from "./sheet-grid-types";
import type { SheetSource } from "./sheet-sources";

const inflight = new Map<string, Promise<SheetGridData | null>>();

async function fetchSheetGrid(source: SheetSource): Promise<SheetGridData | null> {
  if (shouldLoadPricingCatalogGrid(source)) {
    const catalogId = pricingCatalogIdFromSource(source);
    const grid = await fetchPricingCatalogGrid(catalogId);
    writeSheetGridCache(source.id, grid);
    return grid;
  }
  const res = await fetch(source.csvUrl, { method: "GET" });
  if (!res.ok) return null;
  const csv = await res.text();
  const trimmed = csv.trimStart();
  if (trimmed.startsWith("<!") || /^<html[\s>]/i.test(trimmed)) return null;
  const { grid, headerRowIndex } = parseCsvToGrid(csv, {
    headerRowIndex: source.headerRowIndex,
    maxDataRows: shouldLazyParseSheetCsv(csv) ? 300 : undefined,
  });
  writeSheetGridCache(source.id, grid);
  if (!shouldLazyParseSheetCsv(csv)) void writeSheetGridCsvIdb(source.id, csv, headerRowIndex);
  return grid;
}

/** Prefetch sheet CSV into session cache (hover / adjacent row). */
export function prefetchSheetGrid(
  source: SheetSource | null | undefined,
  onCached?: (sheetId: string, grid: SheetGridData) => void,
): void {
  if (!source) return;
  if (!source.csvUrl && !shouldLoadPricingCatalogGrid(source)) return;
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
  for (let offset = 1; offset <= 1; offset += 1) {
    if (index - offset >= 0) prefetchSheetGrid(sources[index - offset], onCached);
    if (index + offset < sources.length) prefetchSheetGrid(sources[index + offset], onCached);
  }
}
