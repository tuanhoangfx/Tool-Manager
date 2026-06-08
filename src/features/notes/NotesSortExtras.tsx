import { ArrowDownWideNarrow } from "lucide-react";
import { SettingsOptionFilter } from "../../lib/settings-option-filter";
import {
  DEFAULT_NOTES_LIST_SORT,
  notesSortSettingLabel,
  patchNotesListPrefs,
  type NotesListSort,
} from "./notes-list-prefs";

const SORT_OPTIONS: NotesListSort[] = ["updated", "created", "title"];

type Props = {
  sort: NotesListSort;
  onSortChange?: (sort: NotesListSort) => void;
};

export function NotesSortExtras({ sort, onSortChange }: Props) {
  const pick = (next: NotesListSort) => {
    patchNotesListPrefs({ nsort: next === DEFAULT_NOTES_LIST_SORT ? null : next });
    onSortChange?.(next);
  };

  return (
    <SettingsOptionFilter
      filterKey="notes-list-sort"
      title="List sort"
      icon={ArrowDownWideNarrow}
      iconClassName="text-sky-300"
      hint="Pinned notes always appear first."
      options={SORT_OPTIONS}
      value={sort}
      onChange={pick}
      formatLabel={notesSortSettingLabel}
    />
  );
}
