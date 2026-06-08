import { resolveCookieSiteIcon } from "./cookieSiteIcon";
import type { CookieAutoRow } from "./CookieAutoSyncTable";
import { resolveRouteSyncedDisplayIso } from "./route-sync-display";
import type { CookieListSort } from "./cookie-list-prefs";

function rowTitle(row: CookieAutoRow): string {
  return (row.note?.title ?? row.binding.noteTitle ?? row.binding.domain ?? "").trim();
}

function rowPlatformLabel(row: CookieAutoRow): string {
  const site = resolveCookieSiteIcon(row.binding.domain);
  return site?.label ?? row.binding.domain ?? "";
}

function rowUpdatedIso(row: CookieAutoRow): string {
  return (
    resolveRouteSyncedDisplayIso({ noteSyncedAt: row.note?.synced_at ?? null }) ??
    row.note?.updated_at ??
    ""
  );
}

/** Cookie Auto routes — after filter, before render. Default: recently synced/edited desc. */
export function sortCookieAutoRows(rows: readonly CookieAutoRow[], sort: CookieListSort): CookieAutoRow[] {
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "created": {
        const tb = new Date(b.note?.created_at ?? 0).getTime();
        const ta = new Date(a.note?.created_at ?? 0).getTime();
        return tb - ta;
      }
      case "platform": {
        const cmp = rowPlatformLabel(a).localeCompare(rowPlatformLabel(b), undefined, { sensitivity: "base" });
        return cmp !== 0 ? cmp : rowTitle(a).localeCompare(rowTitle(b), undefined, { sensitivity: "base" });
      }
      case "title": {
        const cmp = rowTitle(a).localeCompare(rowTitle(b), undefined, { sensitivity: "base" });
        return cmp !== 0 ? cmp : rowPlatformLabel(a).localeCompare(rowPlatformLabel(b), undefined, { sensitivity: "base" });
      }
      case "updated":
      default: {
        const tb = new Date(rowUpdatedIso(b) || 0).getTime();
        const ta = new Date(rowUpdatedIso(a) || 0).getTime();
        return tb - ta;
      }
    }
  });
}
