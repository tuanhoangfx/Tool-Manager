import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pin, StickyNote } from "lucide-react";
import { FilterBar, type FilterDef, type FilterValues } from "../../components/sales-shell";
import { WorkspaceTabHeader } from "@tool-workspace/hub-ui";
import { readHubListPrefs } from "../../lib/url-prefs";
import { DEFAULT_NOTES_HEADER_STAT_KEYS } from "./notes-display-prefs";
import { NotesFilterToolbar } from "./NotesFilterToolbar";
import {
  DEFAULT_NOTES_FILTER_KEYS,
  readNotesListPrefs,
  type NotesListDensity,
} from "./notes-list-prefs";
import { NOTES_FILTER_DEFS, notesFilterOptions } from "./notes-filters";
import type { NoteListItem } from "./types";
import { workspaceVersionLine } from "../workspace/workspace-tab-header-meta";
import { WorkspaceHeaderActions } from "../workspace/WorkspaceHeaderActions";

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  filterValues: FilterValues;
  onFilterValuesChange: (v: FilterValues) => void;
  notes: NoteListItem[];
  shown: number;
  density: NotesListDensity;
  onDensityChange: (d: NotesListDensity) => void;
  filterToolbar?: React.ReactNode;
  folderSettingsPanel?: React.ReactNode;
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
  filterToolbar,
  folderSettingsPanel,
}: Props) {
  const [prefs, setPrefs] = useState(readNotesListPrefs);
  const [hubPrefs, setHubPrefs] = useState(readHubListPrefs);

  useEffect(() => {
    const sync = () => {
      setPrefs(readNotesListPrefs());
      setHubPrefs(readHubListPrefs());
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_NOTES_HEADER_STAT_KEYS;
  const visFilterKeys = prefs.noteFilters ?? DEFAULT_NOTES_FILTER_KEYS;
  const opts = useMemo(() => notesFilterOptions(notes), [notes]);
  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);
  const syncedCount = useMemo(() => notes.filter((n) => n.sync_status === "synced").length, [notes]);
  const version = useMemo(() => workspaceVersionLine(), []);

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
        <NotesFilterToolbar
          range={hubPrefs.range}
          shown={shown}
          total={notes.length}
          density={density}
          onDensityChange={onDensityChange}
        />
      }
      filterToolbar={filterToolbar}
    />
  );

  return (
    <div data-search-pin data-header-pin>
      <div className="hub-chrome-sticky sticky top-0 z-40 -mx-6 border-b border-white/5 bg-[var(--bg)]">
        <WorkspaceTabHeader
          ariaLabel="Notes header"
          titleIcon={StickyNote}
          titleIconClass="text-indigo-400"
          title="Notes"
          versionLine={version.line}
          versionLive={version.live}
          centerStats={[
            visHeaderStats.has("notes-total")
              ? {
                  key: "notes-total",
                  icon: StickyNote,
                  label: "notes",
                  value: notes.length,
                  toneClass: "text-indigo-300",
                }
              : null,
            visHeaderStats.has("notes-pinned")
              ? {
                  key: "notes-pinned",
                  icon: Pin,
                  label: "pinned",
                  value: pinnedCount,
                  toneClass: "text-violet-300",
                }
              : null,
            visHeaderStats.has("notes-synced")
              ? {
                  key: "notes-synced",
                  icon: CheckCircle2,
                  label: "synced",
                  value: syncedCount,
                  toneClass: "text-emerald-300",
                }
              : null,
          ].filter((stat): stat is NonNullable<typeof stat> => stat !== null)}
          actions={
            <WorkspaceHeaderActions
              screen="notes"
              notesDensity={density}
              onNotesDensityChange={onDensityChange}
              notesFolderSettings={folderSettingsPanel}
            />
          }
          pinSticky={false}
          dividerBelow={false}
          embedded
        />
        {filterBar}
      </div>
    </div>
  );
}
