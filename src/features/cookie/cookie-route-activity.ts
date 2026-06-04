import type { TimeRange } from "../../lib/url-prefs";
import type { NoteListItem } from "../notes/types";
import { matchesTimeRange } from "../notes/notes-filters";
import type { CookieBinding } from "./cookieBridge";

/** Hub time-range on a cookie route — note activity uses extension sync (`synced_at`), not vault load. */
export function routeActivityAt(binding: CookieBinding, note?: NoteListItem): string | undefined {
  const synced = note?.synced_at?.trim();
  if (synced) return synced;
  const noteUpdated = note?.updated_at?.trim();
  if (noteUpdated) return noteUpdated;
  return binding.routeUpdatedAt?.trim() || undefined;
}

export function routeMatchesTimeRange(
  binding: CookieBinding,
  note: NoteListItem | undefined,
  range: TimeRange,
): boolean {
  if (range === "all") return true;
  const activityAt = routeActivityAt(binding, note);
  if (!activityAt) return true;
  return matchesTimeRange(activityAt, range);
}
