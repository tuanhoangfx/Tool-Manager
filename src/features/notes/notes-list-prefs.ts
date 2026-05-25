import { readHubListPrefs, patchHubListPrefs, type TimeRange } from "../../lib/url-prefs";
import { NOTES_FILTER_DEFS } from "./notes-filters";

export type NotesListDensity = "comfort" | "compact";

export type NotesListPrefs = {
  range: TimeRange;
  density: NotesListDensity;
  noteFilters: Set<string> | null;
};

function parseSet(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  return new Set(raw.split(",").filter(Boolean));
}

export function readNotesListPrefs(): NotesListPrefs {
  const hub = readHubListPrefs();
  if (typeof window === "undefined") {
    return { range: hub.range, density: "comfort", noteFilters: null };
  }
  const sp = new URLSearchParams(window.location.search);
  const density = sp.get("ndens") === "compact" ? "compact" : "comfort";
  const noteFilterParam = sp.get("nfilt") ?? sp.get("hfilt");
  return {
    range: hub.range,
    density,
    noteFilters: parseSet(noteFilterParam),
  };
}

export function patchNotesListPrefs(patch: Record<string, string | null>) {
  patchHubListPrefs(patch);
}

export const DEFAULT_NOTES_FILTER_KEYS = new Set(NOTES_FILTER_DEFS.map((f) => f.key));
