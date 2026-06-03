import type { ReactNode } from "react";
import { AppLogButton } from "../../components/sales-shell/AppLogButton";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import { WorkspaceTabDisplayPrefs } from "./WorkspaceTabDisplayPrefs";
import { useWorkspaceLogs } from "./WorkspaceLogProvider";
import type { FilterDef } from "../../components/sales-shell/FilterBar";
import type { NotesListDensity } from "../notes/notes-list-prefs";

type Props = {
  screen: WorkspaceScreen;
  screenFilters?: FilterDef[];
  notesDensity?: NotesListDensity;
  onNotesDensityChange?: (d: NotesListDensity) => void;
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
  notesFolderSettings,
  trailing,
}: Props) {
  const { logs } = useWorkspaceLogs();

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {trailing}
      <AppLogButton logs={logs} />
      <WorkspaceTabDisplayPrefs
        screen={screen}
        screenFilters={screenFilters}
        notesDensity={notesDensity}
        onNotesDensityChange={onNotesDensityChange}
        notesFolderSettings={notesFolderSettings}
      />
    </div>
  );
}
