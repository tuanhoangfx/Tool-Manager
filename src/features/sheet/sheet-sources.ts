import { parseGoogleSheetLink } from "./google-sheet-link";
import { postSheetSourcesCrossTab } from "./sheet-sources-cross-tab";
import { filterSheetPendingDeletes, markSheetPendingDelete } from "./sheet-sync-pending";

export type SheetTitleSource = "auto" | "manual";

export type SheetSource = {
  id: string;
  title: string;
  /** original pasted url (doc or publish) */
  rawUrl: string;
  /** resolved csv url */
  csvUrl: string;
  gid: string;
  createdAt: string;
  /** Last successful CSV fetch for this sheet. */
  lastSyncedAt?: string;
  /** Persisted header row (0-based) after first successful parse. */
  headerRowIndex?: number;
  /** manual = user typed title on import; auto = follow Google tab name. */
  titleSource?: SheetTitleSource;
};

export const SHEET_SOURCES_STORAGE_KEY = "p0020:sheet:sources:v1";
const STORAGE_KEY = SHEET_SOURCES_STORAGE_KEY;
export const SHEET_SOURCES_CHANGE_EVENT = "sheet-sources-change";

export type SheetSourcesChangeDetail = {
  action: "upsert" | "delete";
  sourceId: string;
  source?: SheetSource;
};

function notifySheetSourcesChange(detail: SheetSourcesChangeDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SHEET_SOURCES_CHANGE_EVENT, { detail }));
  postSheetSourcesCrossTab("local-updated");
}

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `sh_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function normalizeSheetSource(row: SheetSource): SheetSource {
  const headerRowIndex =
    typeof row.headerRowIndex === "number" && row.headerRowIndex >= 0
      ? row.headerRowIndex
      : undefined;
  let titleSource: SheetTitleSource | undefined = row.titleSource;
  if (!titleSource) titleSource = "auto";
  const lastSyncedAt = typeof row.lastSyncedAt === "string" ? row.lastSyncedAt : undefined;
  return { ...row, headerRowIndex, titleSource, lastSyncedAt };
}

export function sheetSourceDedupeKey(source: Pick<SheetSource, "rawUrl" | "gid" | "csvUrl">): string {
  const info = parseGoogleSheetLink(source.rawUrl);
  const docId = info.sheetId ?? info.publishId ?? source.csvUrl;
  const gid = (source.gid || info.gid || "0").trim();
  return `${docId}:${gid}`;
}

function pickPreferredSource(a: SheetSource, b: SheetSource): SheetSource {
  const aDefault = /^Sheet gid:\d+$/i.test(a.title);
  const bDefault = /^Sheet gid:\d+$/i.test(b.title);
  if (aDefault && !bDefault) return b;
  if (bDefault && !aDefault) return a;
  return a.createdAt >= b.createdAt ? a : b;
}

/** Merge duplicate doc+gid rows — keep best title / newest. */
export function dedupeSheetSources(list: SheetSource[]): SheetSource[] {
  const byKey = new Map<string, SheetSource>();
  for (const row of list) {
    const key = sheetSourceDedupeKey(row);
    const prev = byKey.get(key);
    byKey.set(key, prev ? pickPreferredSource(prev, row) : normalizeSheetSource(row));
  }
  return [...byKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function loadSheetSources(): SheetSource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? (parsed as SheetSource[]).map(normalizeSheetSource) : [];
    const deduped = filterSheetPendingDeletes(dedupeSheetSources(list));
    if (deduped.length !== list.length) saveSheetSources(deduped);
    return deduped;
  } catch {
    return [];
  }
}

export function saveSheetSources(list: SheetSource[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterSheetPendingDeletes(dedupeSheetSources(list))));
  } catch {
    /* ignore quota */
  }
}

export function addSheetSource(opts: {
  title: string;
  rawUrl: string;
  csvUrl: string;
  gid: string;
  titleSource?: SheetTitleSource;
  headerRowIndex?: number;
}): SheetSource {
  const key = sheetSourceDedupeKey({ rawUrl: opts.rawUrl, gid: opts.gid, csvUrl: opts.csvUrl });
  const existing = loadSheetSources().find((s) => sheetSourceDedupeKey(s) === key);
  if (existing) {
    const title = opts.title.trim();
    if (title && !/^Sheet gid:\d+$/i.test(title) && title !== existing.title) {
      updateSheetSourceTitle(existing.id, title, opts.titleSource);
      return { ...existing, title, titleSource: opts.titleSource ?? existing.titleSource };
    }
    return existing;
  }

  const row: SheetSource = normalizeSheetSource({
    id: newId(),
    title: opts.title.trim() || "Google Sheet",
    rawUrl: opts.rawUrl,
    csvUrl: opts.csvUrl,
    gid: opts.gid,
    createdAt: nowIso(),
    titleSource: opts.titleSource ?? "auto",
    headerRowIndex: opts.headerRowIndex,
  });
  const next = [row, ...loadSheetSources()];
  saveSheetSources(next);
  notifySheetSourcesChange({ action: "upsert", sourceId: row.id, source: row });
  return row;
}

export function removeSheetSource(id: string) {
  const prev = loadSheetSources();
  const removed = prev.find((s) => s.id === id);
  if (removed) markSheetPendingDelete(removed);
  const next = prev.filter((s) => s.id !== id);
  saveSheetSources(next);
  if (removed) notifySheetSourcesChange({ action: "delete", sourceId: id, source: removed });
}

export function updateSheetSourceTitle(id: string, title: string, titleSource?: SheetTitleSource) {
  const next = loadSheetSources().map((s) => {
    if (s.id !== id) return s;
    const patch: SheetSource = { ...s, title: title.trim() || s.title };
    if (titleSource) patch.titleSource = titleSource;
    return patch;
  });
  saveSheetSources(next);
  const updated = next.find((s) => s.id === id);
  if (updated) notifySheetSourcesChange({ action: "upsert", sourceId: id, source: updated });
}

export function updateSheetSourceHeaderRowIndex(id: string, headerRowIndex: number) {
  if (!Number.isFinite(headerRowIndex) || headerRowIndex < 0) return;
  const next = loadSheetSources().map((s) =>
    s.id === id ? { ...s, headerRowIndex: Math.floor(headerRowIndex) } : s,
  );
  saveSheetSources(next);
  const updated = next.find((s) => s.id === id);
  if (updated) notifySheetSourcesChange({ action: "upsert", sourceId: id, source: updated });
}

export function updateSheetSourceLastSynced(id: string, at = nowIso()) {
  const next = loadSheetSources().map((s) => (s.id === id ? { ...s, lastSyncedAt: at } : s));
  saveSheetSources(next);
  const updated = next.find((s) => s.id === id);
  if (updated) notifySheetSourcesChange({ action: "upsert", sourceId: id, source: updated });
}
