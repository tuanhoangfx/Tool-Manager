import { ArrowDownWideNarrow } from "lucide-react";
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
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        <ArrowDownWideNarrow size={11} className="text-sky-300/90" />
        List sort
      </div>
      <p className="text-[10px] leading-snug text-[var(--muted)]">Pinned notes always appear first.</p>
      <div className="inline-flex w-full rounded-lg border border-white/10 bg-white/[.02] p-0.5">
        {SORT_OPTIONS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => pick(id)}
            className={`min-w-0 flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              sort === id
                ? "bg-indigo-500/22 text-indigo-100 shadow-sm ring-1 ring-indigo-500/35"
                : "text-[var(--muted)] hover:bg-white/[.05] hover:text-[var(--text)]"
            }`}
          >
            {notesSortSettingLabel(id)}
          </button>
        ))}
      </div>
    </div>
  );
}
