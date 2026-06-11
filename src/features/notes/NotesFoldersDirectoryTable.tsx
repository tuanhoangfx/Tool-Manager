import { useMemo } from "react";
import { HubDirectoryTableShell, hubDirectoryListResetKey, type HubSortDir } from "@tool-workspace/hub-ui";
import { Hash } from "lucide-react";
import type { NoteFolder } from "./noteFolders";
import { NotesFolderGlyph } from "./NotesFolderGlyph";
import { isSystemFolder } from "./noteFolderLifecycle";

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

function NotesCountCell({ count }: { count: number }) {
  return (
    <span
      className={`hub-users-tool-badge${count === 0 ? " hub-users-tool-badge--empty" : ""}`}
      title={count === 0 ? "No notes tagged" : `${count} note${count === 1 ? "" : "s"}`}
    >
      <Hash size={11} className="hub-users-tool-badge__icon" aria-hidden />
      <span className="hub-users-tool-badge__count tabular-nums">{count}</span>
    </span>
  );
}

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
  const resetKey = useMemo(
    () => hubDirectoryListResetKey(sortKey, sortDir, rows.length),
    [rows.length, sortDir, sortKey],
  );

  return (
    <HubDirectoryTableShell
      items={rows}
      resetKey={resetKey}
      ariaLabel="Folders table pages"
      tableClassName="hub-users-table hub-users-table--folders"
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
      renderRowCells={(folder) => (
        <>
          <td className="hub-users-col--folder-name">
            <FolderNameCell folder={folder} />
          </td>
          <td className="hub-users-col--folder-notes">
            <NotesCountCell count={folder.noteCount} />
          </td>
        </>
      )}
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
