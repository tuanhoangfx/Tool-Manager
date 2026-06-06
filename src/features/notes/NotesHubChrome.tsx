import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Pin, StickyNote } from "lucide-react";
import { HubDirectoryScreen, useHubChromePrefs, WorkspaceTabHeader } from "@tool-workspace/hub-ui";
import type { FilterDef, FilterValues } from "../../components/sales-shell";
import { readHubListPrefs, subscribeHubListPrefs } from "../../lib/url-prefs";
import { DEFAULT_NOTES_HEADER_STAT_KEYS } from "./notes-display-prefs";
import { NotesFilterToolbar } from "./NotesFilterToolbar";
import {
  DEFAULT_NOTES_FILTER_KEYS,
  readNotesListPrefs,
  type NotesListDensity,
  type NotesListSort,
} from "./notes-list-prefs";
import type { NoteFolder } from "./noteFolders";
import { mergeDisplayFolders } from "./noteFolders";
import { notesFiltersWithCounts } from "./notes-filter-counts";
import type { NoteListItem } from "./types";
import { workspaceVersionLine } from "../workspace/workspace-tab-header-meta";
import { WorkspaceHeaderActions } from "../workspace/WorkspaceHeaderActions";

type Props = {
  query: string;
  onQueryChange: (q: string) => void;
  filterValues: FilterValues;
  onFilterValuesChange: (v: FilterValues) => void;
  notes: NoteListItem[];
  noteFolders?: NoteFolder[];
  cookieRouteNoteIds?: ReadonlySet<string>;
  shown: number;
  density: NotesListDensity;
  onDensityChange: (d: NotesListDensity) => void;
  sort: NotesListSort;
  onSortChange: (sort: NotesListSort) => void;
  filterToolbar?: ReactNode;
  folderSettingsPanel?: ReactNode;
  children: ReactNode;
};

/** P0004 HubDirectoryScreen — Notes tab (split body via bodyFlex). */
export function NotesHubChrome({
  query,
  onQueryChange,
  filterValues,
  onFilterValuesChange,
  notes,
  noteFolders = [],
  cookieRouteNoteIds,
  shown,
  density,
  onDensityChange,
  sort,
  onSortChange,
  filterToolbar,
  folderSettingsPanel,
  children,
}: Props) {
  const [prefs, setPrefs] = useState(readNotesListPrefs);
  const [hubPrefs, setHubPrefs] = useState(readHubListPrefs);
  const { searchPin, headerPin, stackChrome } = useHubChromePrefs();
  const version = useMemo(() => workspaceVersionLine(), []);

  useEffect(() => subscribeHubListPrefs(() => {
    setPrefs(readNotesListPrefs());
    setHubPrefs(readHubListPrefs());
  }), []);

  const visHeaderStats = hubPrefs.headerStats ?? DEFAULT_NOTES_HEADER_STAT_KEYS;
  const visFilterKeys = prefs.noteFilters ?? DEFAULT_NOTES_FILTER_KEYS;
  const pinnedCount = useMemo(() => notes.filter((n) => n.pinned).length, [notes]);
  const syncedCount = useMemo(() => notes.filter((n) => n.sync_status === "synced").length, [notes]);

  const hubFilters: FilterDef[] = useMemo(() => {
    const withCounts = notesFiltersWithCounts(
      notes,
      mergeDisplayFolders(noteFolders),
      query,
      filterValues,
      hubPrefs.range,
      cookieRouteNoteIds,
    );
    return withCounts.filter((d) => visFilterKeys.has(d.key));
  }, [cookieRouteNoteIds, filterValues, hubPrefs.range, noteFolders, notes, query, visFilterKeys]);

  return (
    <HubDirectoryScreen
      header={
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
              notesSort={sort}
              onNotesSortChange={onSortChange}
              notesFolderSettings={folderSettingsPanel}
            />
          }
          pinSticky={stackChrome ? false : headerPin}
          dividerBelow={stackChrome ? false : !searchPin}
          embedded={stackChrome}
        />
      }
      filters={hubFilters}
      query={query}
      onQueryChange={onQueryChange}
      filterValues={filterValues}
      onFilterValuesChange={onFilterValuesChange}
      filterPlaceholder="Search notes, domain, slug, sync ID…"
      filterShortcutScope="notes"
      directoryToolbar={
        <NotesFilterToolbar range={hubPrefs.range} shown={shown} total={notes.length} />
      }
      filterRowActions={filterToolbar}
      bodyFlex
    >
      <div className="notes-workspace__body flex min-h-0 flex-1 overflow-hidden">{children}</div>
    </HubDirectoryScreen>
  );
}
