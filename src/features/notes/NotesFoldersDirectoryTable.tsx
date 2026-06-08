import { useMemo } from "react";
import { HubPaginatedTableShell, HubSortIndicator, type HubSortDir } from "@tool-workspace/hub-ui";
import { FolderOpen, Hash, StickyNote } from "lucide-react";
import type { NoteFolder } from "./noteFolders";
import { NotesFolderGlyph } from "./NotesFolderGlyph";
import { isSystemFolder } from "./noteFolderLifecycle";

export type FolderTableSortKey = "name" | "noteCount";

export type FolderTableRow = NoteFolder & { noteCount: number };

type ColumnDef = {
  key: FolderTableSortKey;
  label: string;
  colClass: string;
  icon: typeof FolderOpen;
  iconClass: string;
  align: "left" | "center";
};

const COLUMNS: ColumnDef[] = [
  {
    key: "name",
    label: "Name",
    colClass: "hub-users-col--folder-name",
    icon: FolderOpen,
    iconClass: "hub-users-th-icon--name",
    align: "left",
  },
  {
    key: "noteCount",
    label: "Notes",
    colClass: "hub-users-col--folder-notes",
    icon: StickyNote,
    iconClass: "hub-users-th-icon--tools",
    align: "center",
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

function renderBodyCell(key: FolderTableSortKey, folder: FolderTableRow) {
  switch (key) {
    case "name":
      return (
        <td key={key} className="hub-users-col--folder-name">
          <FolderNameCell folder={folder} />
        </td>
      );
    case "noteCount":
      return (
        <td key={key} className="hub-users-col--folder-notes">
          <NotesCountCell count={folder.noteCount} />
        </td>
      );
    default:
      return null;
  }
}

export function NotesFoldersDirectoryTable({
  rows,
  sortKey,
  sortDir,
  onSort,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allVisibleSelected,
  editingId,
}: {
  rows: FolderTableRow[];
  sortKey: FolderTableSortKey;
  sortDir: HubSortDir;
  onSort: (key: FolderTableSortKey) => void;
  selectedIds: Set<string>;
  onToggleSelect: (folderId: string) => void;
  onToggleSelectAll: () => void;
  allVisibleSelected: boolean;
  editingId: string | null;
}) {
  const visibleDefs = useMemo(() => COLUMNS, []);

  return (
    <HubPaginatedTableShell items={rows} ariaLabel="Folders table pages">
      {(pageRows) => (
    <div className="hub-users-table-wrap overflow-hidden rounded-2xl border border-white/5">
      <table className="hub-users-table hub-users-table--folders">
        <colgroup>
          <col className="hub-users-col--select" />
          {visibleDefs.map((col) => (
            <col key={col.key} className={col.colClass} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="hub-users-col--select" scope="col">
              <label className="hub-users-select-all">
                <input
                  type="checkbox"
                  className="hub-checkbox"
                  checked={rows.length > 0 && allVisibleSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all folders"
                />
              </label>
            </th>
            {visibleDefs.map((col) => {
              const Icon = col.icon;
              return (
                <th key={col.key} className={col.colClass} scope="col">
                  <button
                    type="button"
                    className={`hub-users-th-btn${col.align === "left" ? " hub-users-th-btn--align-start" : ""}`}
                    onClick={() => onSort(col.key)}
                    aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    <span className={`hub-users-th-label${col.align === "left" ? " hub-users-th-label--start" : ""}`}>
                      <Icon size={13} className={`hub-users-th-icon ${col.iconClass}`} aria-hidden />
                      <span className="hub-users-th-text">{col.label}</span>
                      <HubSortIndicator active={sortKey === col.key} dir={sortDir} />
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((folder) => {
            const selected = selectedIds.has(folder.id);
            const isEditing = editingId === folder.id;
            return (
              <tr
                key={folder.id}
                className={`hub-users-row hub-users-row--static${selected ? " is-selected" : ""}${isEditing ? " is-editing" : ""}`}
              >
                <td className="hub-users-col--select" onClick={(e) => e.stopPropagation()}>
                  <label className="hub-users-select-row">
                    <input
                      type="checkbox"
                      className="hub-checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(folder.id)}
                      aria-label={`Select ${folder.name}`}
                    />
                  </label>
                </td>
                {visibleDefs.map((col) => renderBodyCell(col.key, folder))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? <div className="hub-users-empty">No folders yet — use Add to create one.</div> : null}
    </div>
      )}
    </HubPaginatedTableShell>
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
