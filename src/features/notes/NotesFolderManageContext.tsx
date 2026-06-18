import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ToolConfirmDialog } from "../../components/confirm/ToolConfirmDialog";
import type { NoteFolder } from "./noteFolders";
import { countFolderNotes, isSystemFolder } from "./noteFolderLifecycle";
import { NotesFolderFormModal } from "./NotesFolderFormModal";
import {
  NotesFoldersDirectoryTable,
  sortFolderRows,
  type FolderTableSortKey,
} from "./NotesFoldersDirectoryTable";
import { NotesFolderBulkBar } from "./NotesFolderBulkBar";

type ProviderProps = {
  folders: NoteFolder[];
  noteFolders: Record<string, string[]>;
  cookieRouteNoteIds: ReadonlySet<string>;
  notes: { id: string; created_at?: string | null }[];
  onCreateFolder: (name: string, color?: string) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onSetFolderColor: (folderId: string, color: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  children: ReactNode;
};

type NotesFolderManageContextValue = {
  selectedIds: Set<string>;
  toggleSelect: (folderId: string) => void;
  editingId: string | null;
  tableRows: ReturnType<typeof sortFolderRows>;
  sortKey: FolderTableSortKey;
  sortDir: "asc" | "desc";
  onSort: (key: FolderTableSortKey) => void;
  openAdd: () => void;
  openEdit: () => void;
  requestDelete: () => void;
};

const NotesFolderManageContext = createContext<NotesFolderManageContextValue | null>(null);

export function useNotesFolderManage() {
  const ctx = useContext(NotesFolderManageContext);
  if (!ctx) throw new Error("useNotesFolderManage requires NotesFolderManageProvider");
  return ctx;
}

/** Folder table state + bulk bar — bulk actions live in filter row 2. */
export function NotesFolderManageProvider({
  folders,
  noteFolders,
  cookieRouteNoteIds,
  notes,
  onCreateFolder,
  onRenameFolder,
  onSetFolderColor,
  onDeleteFolder,
  children,
}: ProviderProps) {
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

  const openAdd = useCallback(() => {
    setFormMode("add");
    setEditingFolder(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback(() => {
    const id = [...selectedIds].find((folderId) => !isSystemFolder(folderId));
    const folder = folders.find((f) => f.id === id);
    if (!folder || isSystemFolder(folder.id)) return;
    setFormMode("edit");
    setEditingFolder(folder);
    setFormOpen(true);
  }, [folders, selectedIds]);

  const requestDelete = useCallback(() => {
    const targets = folders.filter((f) => selectedIds.has(f.id) && !isSystemFolder(f.id));
    if (!targets.length) return;
    setPendingDelete(targets);
  }, [folders, selectedIds]);

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

  const editingId = formOpen && formMode === "edit" ? editingFolder?.id ?? null : null;

  const ctxValue = useMemo<NotesFolderManageContextValue>(
    () => ({
      selectedIds,
      toggleSelect,
      editingId,
      tableRows,
      sortKey,
      sortDir,
      onSort,
      openAdd,
      openEdit,
      requestDelete,
    }),
    [
      editingId,
      onSort,
      openAdd,
      openEdit,
      requestDelete,
      selectedIds,
      sortDir,
      sortKey,
      tableRows,
      toggleSelect,
    ],
  );

  return (
    <NotesFolderManageContext.Provider value={ctxValue}>
      {children}
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
    </NotesFolderManageContext.Provider>
  );
}

export function NotesFolderDirectoryTablePanel() {
  const { selectedIds, toggleSelect, editingId, tableRows, sortKey, sortDir, onSort } =
    useNotesFolderManage();

  return (
    <NotesFoldersDirectoryTable
      rows={tableRows}
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      selectedIds={selectedIds}
      onToggleSelect={toggleSelect}
      editingId={editingId}
    />
  );
}

export function NotesFolderBulkBarSlot({ embedded = false }: { embedded?: boolean }) {
  const { selectedIds, openAdd, openEdit, requestDelete } = useNotesFolderManage();
  const userFolderSelection = [...selectedIds].filter((id) => !isSystemFolder(id));

  return (
    <NotesFolderBulkBar
      embedded={embedded}
      hasSelection={userFolderSelection.length > 0}
      selectedCount={userFolderSelection.length}
      onAdd={openAdd}
      onEdit={openEdit}
      onDelete={requestDelete}
    />
  );
}
