import type { NoteListItem } from "../notes/types";
import {
  matchesWorkspacePeriod,
  normalizeWorkspacePeriodKey,
  readWorkspacePeriod,
  type WorkspacePeriodKey,
  type WorkspacePeriodPrefs,
} from "../../lib/hub-workspace-period";
import type { CookieBinding } from "./cookieBridge";

/** Hub time-range on a cookie route — note activity uses extension sync (`synced_at`), not vault load. */
export function routeActivityAt(binding: CookieBinding, note?: NoteListItem): string | undefined {
  const synced = note?.synced_at?.trim();
  if (synced) return synced;
  const noteUpdated = note?.updated_at?.trim();
  if (noteUpdated) return noteUpdated;
  return binding.routeUpdatedAt?.trim() || undefined;
}

function resolvePeriod(period: WorkspacePeriodPrefs | WorkspacePeriodKey | string): WorkspacePeriodPrefs {
  if (typeof period === "object") return period;
  const range = normalizeWorkspacePeriodKey(period, "all");
  return { ...readWorkspacePeriod("cookie", "all"), range };
}

export function routeMatchesTimeRange(
  binding: CookieBinding,
  note: NoteListItem | undefined,
  period: WorkspacePeriodPrefs | WorkspacePeriodKey | string,
): boolean {
  const prefs = resolvePeriod(period);
  if (prefs.range === "all") return true;
  const activityAt = routeActivityAt(binding, note);
  if (!activityAt) return true;
  return matchesWorkspacePeriod(activityAt, prefs);
}
