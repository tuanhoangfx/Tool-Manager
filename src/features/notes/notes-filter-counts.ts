import type { FilterDef, FilterValues } from "../../components/sales-shell";
import type { WorkspacePeriodPrefs } from "../../lib/hub-workspace-period";
import { enrichFilterDefs } from "../../lib/filter-option-counts";
import type { NoteFolder } from "./noteFolders";
import { filterNotes, NOTES_FILTER_DEFS, notesFilterOptions } from "./notes-filters";
import type { NoteListItem } from "./types";

function matchesNotesOption(note: NoteListItem, filterKey: string, value: string): boolean {
  switch (filterKey) {
    case "pinned":
      return (note.pinned ? "pinned" : "unpinned") === value;
    case "sync":
      return note.sync_status === value;
    case "share": {
      const sh = !note.share_enabled ? "private" : note.share_can_edit ? "edit" : "view";
      return sh === value;
    }
    default:
      return false;
  }
}

export function notesFiltersWithCounts(
  notes: NoteListItem[],
  folders: NoteFolder[],
  query: string,
  values: FilterValues,
  period: WorkspacePeriodPrefs,
  cookieRouteNoteIds?: ReadonlySet<string>,
): FilterDef[] {
  const opts = notesFilterOptions(notes, folders);
  const defs: FilterDef[] = NOTES_FILTER_DEFS.map((d) => ({
    key: d.key,
    label: d.label,
    options: opts[d.key as keyof typeof opts] ?? [],
  }));

  return enrichFilterDefs(
    notes,
    defs,
    query,
    values,
    (note, q, filters) => filterNotes([note], q, filters, period, cookieRouteNoteIds).length > 0,
    matchesNotesOption,
  );
}
