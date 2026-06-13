import {
  DirectoryTableBodyCell,
  HubDirectoryToolBadge,
  type HubDirectoryColumnDef,
} from "@tool-workspace/hub-ui";
import { Hash } from "lucide-react";
import type { FolderTableRow } from "./NotesFoldersDirectoryTable";
import { NotesFolderGlyph } from "./NotesFolderGlyph";
import { isSystemFolder } from "./noteFolderLifecycle";

export type FolderTableSortKey = "name" | "noteCount";

function FolderNameCell({ folder }: { folder: FolderTableRow }) {
  return (
    <div className="hub-users-cell-name">
      <NotesFolderGlyph color={folder.color} size={12} variant="badge" />
      <span className="hub-users-name-title min-w-0" title={folder.name}>
        {folder.name}
      </span>
      {isSystemFolder(folder.id) ? (
        <span className="shrink-0 rounded border border-amber-400/25 bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-100/90">
          System
        </span>
      ) : null}
    </div>
  );
}

export function renderNotesFoldersDirectoryBodyCell(
  col: HubDirectoryColumnDef<FolderTableSortKey>,
  folder: FolderTableRow,
) {
  const { key, colClass } = col;
  switch (key) {
    case "name":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <FolderNameCell folder={folder} />
        </DirectoryTableBodyCell>
      );
    case "noteCount":
      return (
        <DirectoryTableBodyCell key={key} colClass={colClass}>
          <HubDirectoryToolBadge
            label={String(folder.noteCount)}
            icon={Hash}
            empty={folder.noteCount === 0}
            title={
              folder.noteCount === 0
                ? "No notes tagged"
                : `${folder.noteCount} note${folder.noteCount === 1 ? "" : "s"}`
            }
            countClassName="tabular-nums"
          />
        </DirectoryTableBodyCell>
      );
    default:
      return null;
  }
}
