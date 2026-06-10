import type { ReactNode } from "react";
import { HubLogButton, type HubLogExtraSection, type HubLogQuickAction } from "@tool-workspace/hub-ui";
import { HubNotifyButton } from "@tool-workspace/hub-ui";
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
  /** Rare tab-specific actions before Log / Notify (e.g. Todo admin view toggle). */
  trailing?: ReactNode;
  /** Optional Notify bell — Todo task notifications. */
  notify?: {
    unreadCount: number;
    onClick: () => void;
    disabled?: boolean;
  };
  /** Shortcuts inside Log modal. */
  logQuickActions?: HubLogQuickAction[];
  /** Embedded sections in Log modal (e.g. Todo activity log). */
  logExtraSections?: HubLogExtraSection[];
  /** Todo tab Settings extras (task defaults). */
  todoSettingsExtras?: ReactNode;
  /** Todo tab Settings footer actions (e.g. Save task defaults). */
  todoSettingsFooterActions?: ReactNode;
};

/** P0004 Hub pattern: Notify · Log + Settings on the right of every tab header. */
export function WorkspaceHeaderActions({
  screen,
  screenFilters = [],
  notesDensity,
  onNotesDensityChange,
  notesSort,
  onNotesSortChange,
  notesFolderSettings,
  trailing,
  notify,
  logQuickActions,
  logExtraSections,
  todoSettingsExtras,
  todoSettingsFooterActions,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {trailing}
      {notify ? (
        <HubNotifyButton
          unreadCount={notify.unreadCount}
          onClick={notify.onClick}
          disabled={notify.disabled}
        />
      ) : null}
      <HubLogButton variant="tab" quickActions={logQuickActions} extraSections={logExtraSections} />
      <WorkspaceTabDisplayPrefs
        screen={screen}
        screenFilters={screenFilters}
        notesDensity={notesDensity}
        onNotesDensityChange={onNotesDensityChange}
        notesSort={notesSort}
        onNotesSortChange={onNotesSortChange}
        notesFolderSettings={notesFolderSettings}
        todoSettingsExtras={todoSettingsExtras}
        todoSettingsFooterActions={todoSettingsFooterActions}
      />
    </div>
  );
}
