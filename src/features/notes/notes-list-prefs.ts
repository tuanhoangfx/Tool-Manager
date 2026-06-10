import { parseHubPrefSet, patchHubListPrefs } from "../../lib/url-prefs";
import { readWorkspacePeriod, type WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
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

export type NotesListPrefs = WorkspacePeriodPrefs & {
  density: NotesListDensity;
  sort: NotesListSort;
  noteFilters: Set<string> | null;
};

export function readNotesListPrefs(): NotesListPrefs {
  const period = readWorkspacePeriod("notes", "all");
  if (typeof window === "undefined") {
    return { ...period, density: "comfort", sort: DEFAULT_NOTES_LIST_SORT, noteFilters: null };
  }
  const sp = new URLSearchParams(window.location.search);
  const density = sp.get("ndens") === "compact" ? "compact" : "comfort";
  return {
    ...period,
    density,
    sort: parseNotesListSort(sp.get("nsort")),
    noteFilters: parseHubPrefSet(sp.get("nfilt")),
  };
}

export function patchNotesListPrefs(patch: Record<string, string | null>) {
  patchHubListPrefs(patch);
}

export const DEFAULT_NOTES_FILTER_KEYS = new Set(NOTES_FILTER_DEFS.map((f) => f.key));
