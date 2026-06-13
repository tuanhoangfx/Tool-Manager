import { useMemo } from "react";
import {
  HubDirectoryTableShell,
  buildDirectoryColgroup,
  hubDirectoryListResetKey,
  hubDirectoryTableClass,
  type HubSortDir,
} from "@tool-workspace/hub-ui";
import type { NoteFolder } from "./noteFolders";
import { renderNotesFoldersDirectoryBodyCell } from "./notes-folders-directory-cells";

export type FolderTableSortKey = "name" | "noteCount";

export type FolderTableRow = NoteFolder & { noteCount: number };

const COLUMNS = [
  {
    key: "name" as const,
    label: "Name",
    role: "name" as const,
    colClass: "hub-users-col--folder-name",
    headerAlign: "start" as const,
  },
  {
    key: "noteCount" as const,
    label: "Notes",
    role: "tools" as const,
    colClass: "hub-users-col--folder-notes",
    headerAlign: "center" as const,
  },
];

export function NotesFoldersDirectoryTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  selectedIds,
  onToggleSelect,
  editingId,
}: {
  rows: FolderTableRow[];
  sortKey: FolderTableSortKey;
  sortDir: HubSortDir;
  onSort: (key: FolderTableSortKey) => void;
  selectedIds: Set<string>;
  onToggleSelect: (folderId: string) => void;
  editingId: string | null;
}) {
  const columns = useMemo(() => COLUMNS, []);
  const colgroup = useMemo(
    () => buildDirectoryColgroup(columns, { includeSelect: true }),
    [columns],
  );
  const resetKey = useMemo(
    () => hubDirectoryListResetKey(sortKey, sortDir, rows.length),
    [rows.length, sortDir, sortKey],
  );

  return (
    <HubDirectoryTableShell
      items={rows}
      resetKey={resetKey}
      ariaLabel="Folders table pages"
      tableClassName={`${hubDirectoryTableClass("default")} hub-users-table--folders`}
      colgroup={colgroup}
      columns={columns}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      getRowKey={(folder) => folder.id}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      selectAllLabel="Select all folders on this page"
      emptyMessage="No folders yet — use Add to create one."
      getRowClassName={(folder) =>
        ` hub-users-row--static${editingId === folder.id ? " is-editing" : ""}`
      }
      renderRowCells={(folder) =>
        columns.map((col) => renderNotesFoldersDirectoryBodyCell(col, folder))
      }
    />
  );
}

export function countNotesInFolder(noteFolders: Record<string, string[]>, folderId: string): number {
  let count = 0;
  for (const ids of Object.values(noteFolders)) {
    if (ids.includes(folderId)) count += 1;
  }
  return count;
}

export function sortFolderRows(
  rows: FolderTableRow[],
  sortKey: FolderTableSortKey,
  sortDir: HubSortDir,
): FolderTableRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortKey === "noteCount") return (a.noteCount - b.noteCount) * dir;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * dir;
  });
}
