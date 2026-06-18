const DB_NAME = "p0020-sheet-grid-v1";
const STORE = "grids";
export const SHEET_GRID_IDB_MAX_ENTRIES = 20;
export const SHEET_GRID_IDB_MAX_CSV_CHARS = 2_000_000;

export type SheetGridIdbEntry = {
  sheetId: string;
  csv: string;
  cachedAt: number;
  headerRowIndex?: number;
};

export function trimSheetGridCsv(csv: string): string {
  if (csv.length <= SHEET_GRID_IDB_MAX_CSV_CHARS) return csv;
  return csv.slice(0, SHEET_GRID_IDB_MAX_CSV_CHARS);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "sheetId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = run(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
        t.onerror = () => {
          reject(t.error);
          db.close();
        };
      }),
  );
}

async function pruneEntries(): Promise<void> {
  const rows = (await tx("readonly", (s) => s.getAll())) as SheetGridIdbEntry[];
  if (rows.length <= SHEET_GRID_IDB_MAX_ENTRIES) return;
  const drop = rows
    .sort((a, b) => a.cachedAt - b.cachedAt)
    .slice(0, rows.length - SHEET_GRID_IDB_MAX_ENTRIES);
  for (const row of drop) {
    await tx("readwrite", (s) => s.delete(row.sheetId));
  }
}

export async function readSheetGridCsvIdb(
  sheetId: string,
): Promise<Pick<SheetGridIdbEntry, "csv" | "cachedAt" | "headerRowIndex"> | null> {
  if (!sheetId || typeof indexedDB === "undefined") return null;
  try {
    const row = (await tx("readonly", (s) => s.get(sheetId))) as SheetGridIdbEntry | undefined;
    if (!row?.csv) return null;
    return { csv: row.csv, cachedAt: row.cachedAt, headerRowIndex: row.headerRowIndex };
  } catch {
    return null;
  }
}

export async function writeSheetGridCsvIdb(
  sheetId: string,
  csv: string,
  headerRowIndex?: number,
): Promise<void> {
  if (!sheetId || typeof indexedDB === "undefined") return;
  const trimmed = trimSheetGridCsv(csv);
  if (!trimmed.trim()) return;
  try {
    const entry: SheetGridIdbEntry = {
      sheetId,
      csv: trimmed,
      cachedAt: Date.now(),
      headerRowIndex:
        typeof headerRowIndex === "number" && headerRowIndex >= 0
          ? Math.floor(headerRowIndex)
          : undefined,
    };
    await tx("readwrite", (s) => s.put(entry));
    await pruneEntries();
  } catch {
    /* quota / private mode */
  }
}

export async function deleteSheetGridCsvIdb(sheetId: string): Promise<void> {
  if (!sheetId || typeof indexedDB === "undefined") return;
  try {
    await tx("readwrite", (s) => s.delete(sheetId));
  } catch {
    /* ignore */
  }
}
