import type { SheetGridData } from "./sheet-grid-types";

const STORAGE_KEY = "p0020-sheet-grid-cache-v1";
const MAX_ENTRIES = 6;
const MAX_ROWS = 800;

type CacheBlob = Record<string, { grid: SheetGridData; cachedAt: number }>;

function trimGrid(grid: SheetGridData): SheetGridData {
  if (grid.rows.length <= MAX_ROWS) return grid;
  return { header: grid.header, rows: grid.rows.slice(0, MAX_ROWS) };
}

function readBlob(): CacheBlob {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CacheBlob;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBlob(blob: CacheBlob): void {
  try {
    const keys = Object.keys(blob).sort((a, b) => blob[b]!.cachedAt - blob[a]!.cachedAt);
    const next: CacheBlob = {};
    for (const id of keys.slice(0, MAX_ENTRIES)) next[id] = blob[id]!;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
}

export function readSheetGridCache(sheetId: string): SheetGridData | null {
  if (!sheetId) return null;
  return readBlob()[sheetId]?.grid ?? null;
}

export function writeSheetGridCache(sheetId: string, grid: SheetGridData): void {
  if (!sheetId) return;
  const blob = readBlob();
  blob[sheetId] = { grid: trimGrid(grid), cachedAt: Date.now() };
  writeBlob(blob);
}

export function deleteSheetGridCache(sheetId: string): void {
  if (!sheetId) return;
  const blob = readBlob();
  if (!blob[sheetId]) return;
  delete blob[sheetId];
  writeBlob(blob);
}

export function hydrateSheetGridCache(): Map<string, SheetGridData> {
  const map = new Map<string, SheetGridData>();
  for (const [id, entry] of Object.entries(readBlob())) {
    if (entry?.grid?.header) map.set(id, entry.grid);
  }
  return map;
}
