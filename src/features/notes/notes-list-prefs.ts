import { readHubListPrefs, patchHubListPrefs, type TimeRange } from "../../lib/url-prefs";
import { NOTES_FILTER_DEFS } from "./notes-filters";

export type NotesListDensity = "comfort" | "compact";

/** Left-rail ordering (URL `nsort`; pinned notes always stay on top). */
export type NotesListSort = "updated" | "created" | "title";

export const DEFAULT_NOTES_LIST_SORT: NotesListSort = "updated";

const NOTES_SORT_VALUES = new Set<NotesListSort>(["updated", "created", "title"]);

export function parseNotesListSort(raw: string | null): NotesListSort {
  if (raw === "pinned") return DEFAULT_NOTES_LIST_SORT;
  if (raw && NOTES_SORT_VALUES.has(raw as NotesListSort)) return raw as NotesListSort;
  return DEFAULT_NOTES_LIST_SORT;
}

export function notesSortLabel(sort: NotesListSort): string {
  switch (sort) {
    case "created":
      return "Recently created";
    case "title":
      return "Title A–Z";
    case "updated":
    default:
      return "Recently edited";
  }
}

export function notesSortSettingLabel(sort: NotesListSort): string {
  switch (sort) {
    case "created":
      return "Created";
    case "title":
      return "A–Z";
    case "updated":
    default:
      return "Edited";
  }
}

export type NotesListPrefs = {
  range: TimeRange;
  density: NotesListDensity;
  sort: NotesListSort;
  noteFilters: Set<string> | null;
};

function parseSet(raw: string | null): Set<string> | null {
  if (raw === null) return null;
  return new Set(raw.split(",").filter(Boolean));
}

export function readNotesListPrefs(): NotesListPrefs {
  const hub = readHubListPrefs();
  if (typeof window === "undefined") {
    return { range: hub.range, density: "comfort", sort: DEFAULT_NOTES_LIST_SORT, noteFilters: null };
  }
  const sp = new URLSearchParams(window.location.search);
  const density = sp.get("ndens") === "compact" ? "compact" : "comfort";
  return {
    range: hub.range,
    density,
    sort: parseNotesListSort(sp.get("nsort")),
    noteFilters: parseSet(sp.get("nfilt")),
  };
}

export function patchNotesListPrefs(patch: Record<string, string | null>) {
  patchHubListPrefs(patch);
}

export const DEFAULT_NOTES_FILTER_KEYS = new Set(NOTES_FILTER_DEFS.map((f) => f.key));
