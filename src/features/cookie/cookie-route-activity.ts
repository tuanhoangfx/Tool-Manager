import type { TimeRange } from "../../lib/url-prefs";
import type { NoteListItem } from "../notes/types";
import { matchesTimeRange } from "../notes/notes-filters";
import type { CookieBinding } from "./cookieBridge";

/** Best timestamp for Hub time-range on a cookie route (cloud route beats stale note edit). */
export function routeActivityAt(binding: CookieBinding, note?: NoteListItem): string | undefined {
  const routeAt = binding.routeUpdatedAt?.trim();
  if (routeAt) return routeAt;
  const noteUpdated = note?.updated_at?.trim();
  if (noteUpdated) return noteUpdated;
  return note?.synced_at?.trim() || undefined;
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
