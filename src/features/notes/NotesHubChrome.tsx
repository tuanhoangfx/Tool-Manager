import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Pin, StickyNote } from "lucide-react";
import { AppTabHeader, FilterBar, type FilterDef, type FilterValues } from "../../components/sales-shell";
import { APP_VERSION } from "../../lib/app-meta";
import { NotesFilterToolbar } from "./NotesFilterToolbar";
import {
  DEFAULT_NOTES_FILTER_KEYS,
  readNotesListPrefs,
} from "./notes-list-prefs";
import { NOTES_FILTER_DEFS, notesFilterOptions } from "./notes-filters";
import type { NoteListItem } from "./types";
import type { NotesListDensity } from "./notes-list-prefs";

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  filterValues: FilterValues;
  onFilterValuesChange: (v: FilterValues) => void;
  notes: NoteListItem[];
  shown: number;
  density: NotesListDensity;
  onDensityChange: (d: NotesListDensity) => void;
  toolbarExtra?: React.ReactNode;
};

export function NotesHubChrome({
  query,
  onQueryChange,
  filterValues,
  onFilterValuesChange,
  notes,
  shown,
  density,
  onDensityChange,
  toolbarExtra,
}: Props) {
  const [prefs, setPrefs] = useState(readNotesListPrefs);

  useEffect(() => {
    const sync = () => setPrefs(readNotesListPrefs());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const visFilterKeys = prefs.noteFilters ?? DEFAULT_NOTES_FILTER_KEYS;
  const opts = useMemo(() => notesFilterOptions(notes), [notes]);
  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);
  const syncedCount = useMemo(() => notes.filter((n) => n.sync_status === "synced").length, [notes]);

  const hubFilters: FilterDef[] = useMemo(
    () =>
      NOTES_FILTER_DEFS.filter((d) => visFilterKeys.has(d.key)).map((d) => ({
        key: d.key,
        label: d.label,
        options: opts[d.key as keyof typeof opts] ?? [],
        showAllLabel: true,
      })),
    [opts, visFilterKeys],
  );

  const filterBar = (
    <FilterBar
      layout="hub"
      pinSticky
      headerPinned
      embedded
      placeholder="Search notes, domain, slug, sync ID…"
      filters={hubFilters}
      query={query}
      onQueryChange={onQueryChange}
      values={filterValues}
      onValuesChange={onFilterValuesChange}
      toolbar={
        <>
          <NotesFilterToolbar
            shown={shown}
            total={notes.length}
            density={density}
            onDensityChange={onDensityChange}
          />
          {toolbarExtra}
        </>
      }
    />
  );

  return (
    <div data-search-pin data-header-pin>
      <div className="hub-chrome-sticky sticky top-0 z-40 -mx-6 border-b border-white/5 bg-[var(--bg)]">
        <AppTabHeader
          ariaLabel="Notes header"
          titleIcon={StickyNote}
          titleIconClass="text-indigo-400"
          title="Notes"
          metaItems={[{ icon: FileText, title: "Build", value: `v${APP_VERSION}` }]}
          centerStats={[
            {
              key: "notes-total",
              icon: StickyNote,
              label: "notes",
              value: notes.length,
              toneClass: "text-indigo-300",
            },
            {
              key: "notes-pinned",
              icon: Pin,
              label: "pinned",
              value: pinnedCount,
              toneClass: "text-violet-300",
            },
            {
              key: "notes-synced",
              icon: CheckCircle2,
              label: "synced",
              value: syncedCount,
              toneClass: "text-emerald-300",
            },
          ]}
          pinSticky={false}
          dividerBelow={false}
          embedded
        />
        {filterBar}
      </div>
    </div>
  );
}
