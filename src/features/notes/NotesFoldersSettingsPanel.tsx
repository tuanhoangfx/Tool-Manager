import { useCallback, useMemo, useState } from "react";
import { FolderOpen, StickyNote } from "lucide-react";
import { Section, SectionIcon } from "@tool-workspace/hub-ui";
import { TwofaBulkActionBar } from "../twofa/TwofaBulkActionBar";
import { ToolConfirmDialog } from "../../components/confirm/ToolConfirmDialog";
import type { NoteFolder } from "./noteFolders";
import {
  countFolderNotes,
  getUserFolderIds,
  isCookieAutoFolder,
  isNewFolder,
  isSystemFolder,
  isUnorganizedFolder,
} from "./noteFolderLifecycle";
import { NotesFolderFormModal } from "./NotesFolderFormModal";
import {
  NotesFoldersDirectoryTable,
  sortFolderRows,
  type FolderTableSortKey,
} from "./NotesFoldersDirectoryTable";

type Props = {
  folders: NoteFolder[];
  noteFolders: Record<string, string[]>;
  cookieRouteNoteIds: ReadonlySet<string>;
  notes: { id: string; created_at?: string | null }[];
  selectedNoteId: string | null;
  selectedNoteFolderIds: string[];
  onCreateFolder: (name: string, color?: string) => Promise<void>;
  onToggleNoteFolder: (folderId: string, enabled: boolean) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onSetFolderColor: (folderId: string, color: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
};

export function NotesFoldersSettingsPanel({
  folders,
  noteFolders,
  cookieRouteNoteIds,
  notes,
  selectedNoteId,
  selectedNoteFolderIds,
  onCreateFolder,
  onToggleNoteFolder,
  onRenameFolder,
  onSetFolderColor,
  onDeleteFolder,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [sortKey, setSortKey] = useState<FolderTableSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NoteFolder[] | null>(null);

  const tableRows = useMemo(
    () =>
      sortFolderRows(
        folders.map((folder) => ({
          ...folder,
          noteCount: countFolderNotes(folder.id, noteFolders, cookieRouteNoteIds, notes),
        })),
        sortKey,
        sortDir,
      ),
    [cookieRouteNoteIds, folders, noteFolders, notes, sortDir, sortKey],
  );

  const noteHasCookieRoute = Boolean(selectedNoteId && cookieRouteNoteIds.has(selectedNoteId));
  const userFolderSelection = [...selectedIds].filter((id) => !isSystemFolder(id));
  const toggleSelect = useCallback((folderId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  const onSort = useCallback(
    (key: FolderTableSortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  const openAdd = () => {
    setFormMode("add");
    setEditingFolder(null);
    setFormOpen(true);
  };

  const openEdit = () => {
    const id = userFolderSelection[0];
    const folder = folders.find((f) => f.id === id);
    if (!folder || isSystemFolder(folder.id)) return;
    setFormMode("edit");
    setEditingFolder(folder);
    setFormOpen(true);
  };

  const requestDelete = () => {
    const targets = folders.filter((f) => selectedIds.has(f.id) && !isSystemFolder(f.id));
    if (!targets.length) return;
    setPendingDelete(targets);
  };

  const confirmDelete = async () => {
    if (!pendingDelete?.length) return;
    for (const folder of pendingDelete) {
      await onDeleteFolder(folder.id);
    }
    setSelectedIds(new Set());
    setPendingDelete(null);
  };

  const deleteMessage =
    pendingDelete && pendingDelete.length > 0 ? (
      <>
        Delete{" "}
        {pendingDelete.length === 1 ? (
          <strong>{pendingDelete[0].name}</strong>
        ) : (
          <>
            <strong>{pendingDelete.length} folders</strong>
            {pendingDelete.length <= 4 ? <> ({pendingDelete.map((f) => f.name).join(", ")})</> : null}
          </>
        )}
        ? Notes keep their content; only folder tags are removed.
      </>
    ) : null;

  return (
    <div className="space-y-3 text-xs">
      <Section icon={<SectionIcon icon={StickyNote} className="text-indigo-300" />} label="Tag this note">
        {!selectedNoteId ? (
          <p className="rounded-lg border border-dashed border-white/10 bg-white/[.02] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
            Select a note, then tap a folder chip to tag it.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {folders.map((folder) => {
              const active = selectedNoteFolderIds.includes(folder.id);
              const autoLocked =
                (isCookieAutoFolder(folder.id) && noteHasCookieRoute) ||
                isNewFolder(folder.id) ||
                isUnorganizedFolder(folder.id);
              const chipDisabled = !selectedNoteId || autoLocked;
              return (
                <button
                  key={`tag-${folder.id}`}
                  type="button"
                  disabled={chipDisabled}
                  title={
                    autoLocked
                      ? isNewFolder(folder.id)
                        ? "Auto — new notes stay here for 24h"
                        : isUnorganizedFolder(folder.id)
                          ? "Auto — notes without a custom folder after New"
                          : "Auto — note has a Cookie Bridge route"
                      : undefined
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? "border-indigo-400/35 bg-indigo-500/14 text-indigo-100"
                      : "border-white/10 bg-white/[.03] text-[var(--muted)]"
                  } disabled:cursor-default disabled:opacity-85`}
                  onClick={() => {
                    if (chipDisabled || !selectedNoteId) return;
                    void onToggleNoteFolder(folder.id, !active);
                  }}
                >
                  <FolderOpen
                    size={12}
                    className="shrink-0"
                    style={{ color: folder.color }}
                    aria-hidden
                  />
                  {folder.name}
                  {autoLocked ? (
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-200/90">Auto</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <TwofaBulkActionBar
        hasSelection={userFolderSelection.length > 0}
        selectedCount={userFolderSelection.length}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={requestDelete}
      />

      <NotesFoldersDirectoryTable
        rows={tableRows}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        editingId={formOpen && formMode === "edit" ? editingFolder?.id ?? null : null}
      />

      <NotesFolderFormModal
        open={formOpen}
        mode={formMode}
        initial={editingFolder}
        onClose={() => setFormOpen(false)}
        onSave={async (draft) => {
          if (formMode === "add") {
            await onCreateFolder(draft.name, draft.color);
          } else if (editingFolder) {
            if (draft.name !== editingFolder.name) await onRenameFolder(editingFolder.id, draft.name);
            if (draft.color !== editingFolder.color) await onSetFolderColor(editingFolder.id, draft.color);
          }
        }}
      />

      <ToolConfirmDialog
        open={Boolean(pendingDelete?.length)}
        title={pendingDelete && pendingDelete.length > 1 ? "Delete folders" : "Delete folder"}
        message={deleteMessage}
        onConfirm={() => void confirmDelete()}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
