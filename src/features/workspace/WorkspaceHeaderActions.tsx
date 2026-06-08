import type { ReactNode } from "react";
import { HubLogButton } from "@tool-workspace/hub-ui";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { WorkspaceTabDisplayPrefs } from "./WorkspaceTabDisplayPrefs";
import type { FilterDef } from "../../components/sales-shell";
import type { NotesListDensity, NotesListSort } from "../notes/notes-list-prefs";

type Props = {
  screen: WorkspaceScreen;
  screenFilters?: FilterDef[];
  notesDensity?: NotesListDensity;
  onNotesDensityChange?: (d: NotesListDensity) => void;
  notesSort?: NotesListSort;
  onNotesSortChange?: (sort: NotesListSort) => void;
  notesFolderSettings?: ReactNode;
  /** Rare tab-specific actions before Log (avoid download CTAs — use FAB). */
  trailing?: ReactNode;
};

/** P0004 Hub pattern: Log + Settings on the right of every tab header. */
export function WorkspaceHeaderActions({
  screen,
  screenFilters = [],
  notesDensity,
  onNotesDensityChange,
  notesSort,
  onNotesSortChange,
  notesFolderSettings,
  trailing,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {trailing}
      <HubLogButton variant="tab" />
      <WorkspaceTabDisplayPrefs
        screen={screen}
        screenFilters={screenFilters}
        notesDensity={notesDensity}
        onNotesDensityChange={onNotesDensityChange}
        notesSort={notesSort}
        onNotesSortChange={onNotesSortChange}
        notesFolderSettings={notesFolderSettings}
      />
    </div>
  );
}
