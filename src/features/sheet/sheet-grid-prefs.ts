import { seedSheetGridColumnWidths } from "./sheet-grid-column-hints";
import { computeAutoHiddenColumnIndices } from "./sheet-column-auto-hide";

const STORAGE_KEY = "p0020:sheet:grid-prefs:v1";
const HEADER_FP_KEY = "p0020:sheet:grid-header-fp:v1";
const AUTO_HIDE_MIGRATION_KEY = "p0020:sheet:grid-auto-hide:v3";
const CHANGE_EVENT = "sheet-grid-prefs-change";

export type SheetColumnFit = "equal" | "weighted";
export type SheetTextAlign = "left" | "center" | "right";

export type SheetGridColumnPrefs = {
  hidden: number[];
  widths: Record<string, number>;
  /** Wrap cell text — no horizontal scroll. */
  wrap?: boolean;
  /** equal — even columns; weighted — use saved resize weights. */
  columnFit?: SheetColumnFit;
  /** Header + cell horizontal alignment. */
  textAlign?: SheetTextAlign;
};

type Store = Record<string, SheetGridColumnPrefs>;

const DEFAULT_PREFS: SheetGridColumnPrefs = {
  hidden: [],
  widths: {},
  wrap: true,
  columnFit: "equal",
  textAlign: "left",
};

function normalizeTextAlign(value: unknown): SheetTextAlign {
  if (value === "center" || value === "right") return value;
  return "left";
}

function normalizeColumnFit(value: unknown): SheetColumnFit {
  return value === "weighted" ? "weighted" : "equal";
}

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(store: Store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore quota */
  }
}

function clampWidth(w: unknown): number | undefined {
  if (typeof w !== "number" || !Number.isFinite(w)) return undefined;
  return Math.min(SHEET_GRID_MAX_COL_WIDTH, Math.max(SHEET_GRID_MIN_COL_WIDTH, w));
}

export function readSheetGridPrefs(sheetId: string): SheetGridColumnPrefs {
  const row = loadStore()[sheetId];
  if (!row) return { ...DEFAULT_PREFS, widths: {}, hidden: [] };
  const widths: Record<string, number> = {};
  if (row.widths && typeof row.widths === "object") {
    for (const [k, v] of Object.entries(row.widths)) {
      const clamped = clampWidth(v);
      if (clamped != null) widths[k] = clamped;
    }
  }
  return {
    hidden: Array.isArray(row.hidden) ? row.hidden.filter((n) => Number.isFinite(n)) : [],
    widths,
    wrap: row.wrap !== undefined ? Boolean(row.wrap) : DEFAULT_PREFS.wrap!,
    columnFit: normalizeColumnFit(row.columnFit),
    textAlign: normalizeTextAlign(row.textAlign ?? DEFAULT_PREFS.textAlign),
  };
}

export function writeSheetGridPrefs(sheetId: string, patch: Partial<SheetGridColumnPrefs>) {
  const store = loadStore();
  const prev = readSheetGridPrefs(sheetId);
  store[sheetId] = {
    hidden: patch.hidden ?? prev.hidden,
    widths: patch.widths ?? prev.widths,
    wrap: patch.wrap ?? prev.wrap,
    columnFit: patch.columnFit != null ? normalizeColumnFit(patch.columnFit) : prev.columnFit,
    textAlign: patch.textAlign != null ? normalizeTextAlign(patch.textAlign) : prev.textAlign,
  };
  saveStore(store);
}

/** Clear saved resize weights; restore even column fit. */
export function resetSheetGridColumnWidths(sheetId: string): SheetGridColumnPrefs {
  const prev = readSheetGridPrefs(sheetId);
  const next: SheetGridColumnPrefs = { ...prev, widths: {}, columnFit: "equal" };
  writeSheetGridPrefs(sheetId, next);
  return next;
}

function loadHeaderFingerprints(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(HEADER_FP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveHeaderFingerprint(sheetId: string, fp: string) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadHeaderFingerprints(), [sheetId]: fp };
    localStorage.setItem(HEADER_FP_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

function loadAutoHideMigrated(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(AUTO_HIDE_MIGRATION_KEY) === "1";
  } catch {
    return true;
  }
}

function saveAutoHideMigrated() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_HIDE_MIGRATION_KEY, "1");
  } catch {
    /* ignore quota */
  }
}

/** Drop stale hidden indices; auto-hide wide sheets on first load / header change. */
export function reconcileSheetGridPrefs(
  sheetId: string,
  header: string[],
  rows: string[][] = [],
): SheetGridColumnPrefs {
  const prefs = readSheetGridPrefs(sheetId);
  const fp = header.join("\0");
  const prevFp = loadHeaderFingerprints()[sheetId];
  const headerChanged = prevFp != null && prevFp !== fp;
  const firstSeen = prevFp == null;
  const needsAutoHideMigration = !loadAutoHideMigrated();
  const validHidden = prefs.hidden.filter((i) => Number.isFinite(i) && i >= 0 && i < header.length);

  const shouldReconcileHidden =
    needsAutoHideMigration || headerChanged || firstSeen || validHidden.length !== prefs.hidden.length;
  const emptyOnlyHidden =
    header.length > 0 && rows.length > 0 ? computeAutoHiddenColumnIndices(header, rows) : [];

  if (shouldReconcileHidden) {
    const seedWidths = headerChanged || needsAutoHideMigration || firstSeen;
    const next: SheetGridColumnPrefs = {
      ...prefs,
      hidden: emptyOnlyHidden,
      widths: seedWidths ? seedSheetGridColumnWidths(header) : prefs.widths,
      columnFit: seedWidths ? "weighted" : prefs.columnFit,
    };
    writeSheetGridPrefs(sheetId, next);
    saveHeaderFingerprint(sheetId, fp);
    if (needsAutoHideMigration) saveAutoHideMigrated();
    return next;
  }

  if (prevFp !== fp) saveHeaderFingerprint(sheetId, fp);
  return prefs;
}

export function subscribeSheetGridPrefs(onSync: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onSync();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export const SHEET_GRID_DEFAULT_COL_WIDTH = 160;
export const SHEET_GRID_MIN_COL_WIDTH = 72;
export const SHEET_GRID_MAX_COL_WIDTH = 640;
