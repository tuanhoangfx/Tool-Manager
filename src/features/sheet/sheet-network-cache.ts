import type { SheetSource } from "./sheet-sources";

/** Skip Google CSV refetch when a warm grid cache exists and sync is recent. */
export const SHEET_NETWORK_FETCH_TTL_MS = 5 * 60 * 1000;

export function isSheetNetworkCacheFresh(
  source: Pick<SheetSource, "lastSyncedAt">,
  now = Date.now(),
): boolean {
  const at = source.lastSyncedAt;
  if (!at) return false;
  const ts = Date.parse(at);
  if (!Number.isFinite(ts)) return false;
  return now - ts < SHEET_NETWORK_FETCH_TTL_MS;
}
