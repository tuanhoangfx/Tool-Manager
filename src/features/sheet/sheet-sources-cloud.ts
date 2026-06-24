import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import {
  dedupeSheetSources,
  loadSheetSources,
  saveSheetSources,
  sheetSourceDedupeKey,
  type SheetSource,
  type SheetTitleSource,
} from "./sheet-sources";
import {
  clearSheetPendingDelete,
  filterSheetPendingDeletes,
  isSheetPendingDelete,
} from "./sheet-sync-pending";

type SheetSourceRow = {
  id: string;
  user_id: string;
  title: string;
  raw_url: string;
  csv_url: string;
  gid: string;
  dedupe_key: string;
  title_source: string;
  header_row_index: number | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id,user_id,title,raw_url,csv_url,gid,dedupe_key,title_source,header_row_index,last_synced_at,created_at,updated_at";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function rowToSource(row: SheetSourceRow): SheetSource {
  return {
    id: row.id,
    title: row.title,
    rawUrl: row.raw_url,
    csvUrl: row.csv_url,
    gid: row.gid,
    createdAt: row.created_at,
    lastSyncedAt: row.last_synced_at ?? undefined,
    headerRowIndex: row.header_row_index ?? undefined,
    titleSource: (row.title_source === "manual" ? "manual" : "auto") as SheetTitleSource,
  };
}

function sourceToPayload(source: SheetSource, userId: string, id?: string) {
  return {
    id: id ?? (isUuid(source.id) ? source.id : undefined),
    user_id: userId,
    title: source.title,
    raw_url: source.rawUrl,
    csv_url: source.csvUrl,
    gid: source.gid || "0",
    dedupe_key: sheetSourceDedupeKey(source),
    title_source: source.titleSource ?? "auto",
    header_row_index:
      typeof source.headerRowIndex === "number" && source.headerRowIndex >= 0
        ? Math.floor(source.headerRowIndex)
        : null,
    last_synced_at: source.lastSyncedAt ?? null,
    created_at: source.createdAt,
    updated_at: source.lastSyncedAt ?? source.createdAt,
  };
}

function pickPreferredSource(a: SheetSource, b: SheetSource): SheetSource {
  const aDefault = /^Sheet gid:\d+$/i.test(a.title);
  const bDefault = /^Sheet gid:\d+$/i.test(b.title);
  if (aDefault && !bDefault) return b;
  if (bDefault && !aDefault) return a;
  const aTs = Date.parse(a.lastSyncedAt ?? a.createdAt);
  const bTs = Date.parse(b.lastSyncedAt ?? b.createdAt);
  if (aTs !== bTs) return aTs >= bTs ? a : b;
  return a.createdAt >= b.createdAt ? a : b;
}

function mergeTwoSources(a: SheetSource, b: SheetSource): SheetSource {
  const preferred = pickPreferredSource(a, b);
  const other = preferred.id === a.id ? b : a;
  const id = isUuid(preferred.id) ? preferred.id : isUuid(other.id) ? other.id : preferred.id;
  const titleSource: SheetTitleSource =
    preferred.titleSource === "manual" || other.titleSource === "manual" ? "manual" : "auto";
  return {
    ...preferred,
    id,
    title: preferred.titleSource === "manual" ? preferred.title : other.titleSource === "manual" ? other.title : preferred.title,
    headerRowIndex: preferred.headerRowIndex ?? other.headerRowIndex,
    lastSyncedAt: [preferred.lastSyncedAt, other.lastSyncedAt].filter(Boolean).sort().pop(),
    titleSource,
  };
}

/** Merge local + remote rows by doc+gid dedupe key. */
export function mergeSheetSourcesLocalRemote(local: SheetSource[], remote: SheetSource[]): SheetSource[] {
  const byKey = new Map<string, SheetSource>();
  for (const row of filterSheetPendingDeletes(remote)) {
    byKey.set(sheetSourceDedupeKey(row), row);
  }
  for (const row of filterSheetPendingDeletes(local)) {
    const key = sheetSourceDedupeKey(row);
    const prev = byKey.get(key);
    byKey.set(key, prev ? mergeTwoSources(prev, row) : row);
  }
  return dedupeSheetSources([...byKey.values()]);
}

function isSheetSourcesTableMissing(message: string): boolean {
  return /sheet_sources/i.test(message) && /does not exist|schema cache|not found|relation/i.test(message);
}

export function isSheetSourcesCloudAvailable(): boolean {
  return isSupabaseConfigured;
}

async function fetchRemoteSheetSources(userId: string): Promise<SheetSource[]> {
  const { data, error } = await supabase.from("sheet_sources").select(SELECT_COLS).eq("user_id", userId);
  if (error) {
    if (isSheetSourcesTableMissing(error.message)) return [];
    throw error;
  }
  return ((data ?? []) as SheetSourceRow[]).map(rowToSource);
}

async function upsertSheetSourceRow(source: SheetSource, userId: string): Promise<SheetSource> {
  const dedupeKey = sheetSourceDedupeKey(source);

  if (isUuid(source.id)) {
    const { error } = await supabase
      .from("sheet_sources")
      .upsert(sourceToPayload(source, userId, source.id), { onConflict: "id" });
    if (error) throw error;
    return source;
  }

  const insertRes = await supabase
    .from("sheet_sources")
    .insert(sourceToPayload(source, userId))
    .select(SELECT_COLS)
    .single();
  if (!insertRes.error && insertRes.data) {
    return rowToSource(insertRes.data as SheetSourceRow);
  }

  const existingRes = await supabase
    .from("sheet_sources")
    .select(SELECT_COLS)
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();
  if (existingRes.error) throw existingRes.error;
  if (existingRes.data) {
    const cloudId = (existingRes.data as SheetSourceRow).id;
    const merged = mergeTwoSources(rowToSource(existingRes.data as SheetSourceRow), source);
    const { error } = await supabase
      .from("sheet_sources")
      .update(sourceToPayload(merged, userId, cloudId))
      .eq("id", cloudId);
    if (error) throw error;
    return { ...merged, id: cloudId };
  }

  if (insertRes.error) throw insertRes.error;
  return source;
}

export type SheetSourcesCloudSyncOpts = {
  /** Abort in-flight sync when local generation changes (e.g. delete). */
  isStale?: () => boolean;
};

/** Rows eligible for cloud upsert — excludes in-flight local deletes. */
export function selectSheetSourcesForCloudPush(merged: SheetSource[]): SheetSource[] {
  return filterSheetPendingDeletes(merged);
}

/** Pull cloud, merge with local, push local-only rows, persist merged list. */
export async function syncSheetSourcesWithCloud(
  userId: string,
  opts?: SheetSourcesCloudSyncOpts,
): Promise<SheetSource[]> {
  if (!isSheetSourcesCloudAvailable()) return loadSheetSources();
  if (opts?.isStale?.()) return loadSheetSources();

  const local = loadSheetSources();
  const remote = await fetchRemoteSheetSources(userId);
  if (opts?.isStale?.()) return loadSheetSources();

  const merged = selectSheetSourcesForCloudPush(mergeSheetSourcesLocalRemote(local, remote));

  const next: SheetSource[] = [];
  for (const row of merged) {
    if (opts?.isStale?.()) return loadSheetSources();
    if (isSheetPendingDelete(row)) continue;
    const synced = await upsertSheetSourceRow(row, userId);
    if (opts?.isStale?.()) return loadSheetSources();
    next.push(synced);
  }

  const result = filterSheetPendingDeletes(dedupeSheetSources(next));
  saveSheetSources(result);
  return result;
}

/** Realtime / background pull — cloud is SSOT; keep local-only rows pending first push. */
export function reconcileSheetSourceLists(local: SheetSource[], remote: SheetSource[]): SheetSource[] {
  const localFiltered = filterSheetPendingDeletes(local);
  const remoteFiltered = filterSheetPendingDeletes(remote);
  const remoteByKey = new Map(remoteFiltered.map((r) => [sheetSourceDedupeKey(r), r]));
  const merged: SheetSource[] = [];

  for (const row of remoteFiltered) {
    const key = sheetSourceDedupeKey(row);
    const localMatch = localFiltered.find((s) => sheetSourceDedupeKey(s) === key);
    merged.push(localMatch ? mergeTwoSources(row, localMatch) : row);
  }

  for (const row of localFiltered) {
    const key = sheetSourceDedupeKey(row);
    if (remoteByKey.has(key)) continue;
    if (!isUuid(row.id)) merged.push(row);
  }

  return dedupeSheetSources(merged);
}

export async function reconcileSheetSourcesFromCloud(userId: string): Promise<SheetSource[]> {
  if (!isSheetSourcesCloudAvailable()) return loadSheetSources();

  const local = loadSheetSources();
  const remote = await purgeRemoteTombstonedSheetSources(userId, await fetchRemoteSheetSources(userId));
  const result = filterSheetPendingDeletes(reconcileSheetSourceLists(local, remote));
  saveSheetSources(result);
  return result;
}

export async function pushSheetSourceToCloud(source: SheetSource, userId: string): Promise<void> {
  if (!isSheetSourcesCloudAvailable()) return;
  if (isSheetPendingDelete(source)) return;
  const synced = await upsertSheetSourceRow(source, userId);
  const list = loadSheetSources().map((s) =>
    sheetSourceDedupeKey(s) === sheetSourceDedupeKey(source) ? synced : s,
  );
  saveSheetSources(dedupeSheetSources(list));
}

async function deleteSheetSourceRowFromCloud(source: SheetSource, userId: string): Promise<void> {
  if (isUuid(source.id)) {
    const { error } = await supabase.from("sheet_sources").delete().eq("id", source.id).eq("user_id", userId);
    if (error && !isSheetSourcesTableMissing(error.message)) throw error;
    return;
  }
  const dedupeKey = sheetSourceDedupeKey(source);
  const { error } = await supabase
    .from("sheet_sources")
    .delete()
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey);
  if (error && !isSheetSourcesTableMissing(error.message)) throw error;
}

async function confirmSheetPendingDeleteCleared(source: SheetSource, userId: string): Promise<void> {
  const remote = await fetchRemoteSheetSources(userId);
  const key = sheetSourceDedupeKey(source);
  if (!remote.some((row) => sheetSourceDedupeKey(row) === key)) {
    clearSheetPendingDelete(source);
  }
}

/** Re-delete cloud rows that still exist while local tombstone is active. */
async function purgeRemoteTombstonedSheetSources(userId: string, remote: SheetSource[]): Promise<SheetSource[]> {
  const tombstoned = remote.filter((row) => isSheetPendingDelete(row));
  if (!tombstoned.length) return remote;
  for (const row of tombstoned) {
    await deleteSheetSourceRowFromCloud(row, userId);
  }
  const refetched = await fetchRemoteSheetSources(userId);
  for (const row of tombstoned) {
    await confirmSheetPendingDeleteCleared(row, userId);
  }
  return refetched;
}

export async function deleteSheetSourceFromCloud(source: SheetSource, userId: string): Promise<void> {
  if (!isSheetSourcesCloudAvailable()) return;
  await deleteSheetSourceRowFromCloud(source, userId);
  await confirmSheetPendingDeleteCleared(source, userId);
}
