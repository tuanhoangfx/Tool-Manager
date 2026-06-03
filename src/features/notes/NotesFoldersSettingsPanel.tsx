import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { NoteFolder } from "./noteFolders";

const FOLDER_COLORS = ["#818cf8", "#22d3ee", "#f59e0b", "#a78bfa", "#34d399", "#fb7185"];

type Props = {
  folders: NoteFolder[];
  selectedNoteId: string | null;
  selectedNoteFolderIds: string[];
  routeLocked?: boolean;
  onCreateFolder: (name: string) => Promise<void>;
  onToggleNoteFolder: (folderId: string, enabled: boolean) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onSetFolderColor: (folderId: string, color: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
};

export function NotesFoldersSettingsPanel({
  folders,
  selectedNoteId,
  selectedNoteFolderIds,
  routeLocked = false,
  onCreateFolder,
  onToggleNoteFolder,
  onRenameFolder,
  onSetFolderColor,
  onDeleteFolder,
}: Props) {
  const [newFolderName, setNewFolderName] = useState("");

  return (
    <div className="space-y-4 text-xs">
      {selectedNoteId ? (
        <section className="space-y-2 rounded-lg border border-white/8 bg-white/[.02] p-3">
          <h4 className="text-[11px] font-semibold text-[var(--text)]">Folders for this note</h4>
          <p className="text-[10px] text-[var(--muted)]">A note can belong to multiple folders.</p>
          {routeLocked ? (
            <p className="text-[10px] text-amber-100/90">Folder tags are read-only while a Cookie route is active.</p>
          ) : null}
          <div className="space-y-1">
            {folders.length === 0 ? (
              <p className="text-[10px] text-[var(--muted)]">No folders yet — create one below.</p>
            ) : (
              folders.map((folder) => {
                const checked = selectedNoteFolderIds.includes(folder.id);
                return (
                  <label
                    key={`note-${folder.id}`}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[.04] ${
                      checked ? "bg-indigo-500/10" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hub-checkbox"
                      checked={checked}
                      disabled={routeLocked}
                      onChange={(e) => void onToggleNoteFolder(folder.id, e.target.checked)}
                    />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: folder.color }} />
                    <span className="min-w-0 flex-1 truncate text-[var(--text)]">{folder.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </section>
      ) : (
        <p className="rounded-lg border border-white/8 bg-white/[.02] px-3 py-2 text-[10px] text-[var(--muted)]">
          Select a note to tag it with folders.
        </p>
      )}

      <section className="space-y-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)]">
          <FolderOpen size={12} className="text-amber-300" />
          Manage folders
        </h4>
        <div className="flex gap-2">
          <input
            className="field h-8 min-w-0 flex-1 text-[11px]"
            value={newFolderName}
            placeholder="New folder"
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newFolderName.trim()) {
                void onCreateFolder(newFolderName.trim());
                setNewFolderName("");
              }
            }}
          />
          <button
            type="button"
            className="btn inline-flex items-center gap-1 text-[11px] !px-2"
            onClick={() => {
              if (!newFolderName.trim()) return;
              void onCreateFolder(newFolderName.trim());
              setNewFolderName("");
            }}
          >
            <Plus size={12} />
            Add
          </button>
        </div>

        <div className="space-y-1">
          {folders.map((folder) => (
            <div key={folder.id} className="rounded-lg border border-white/5 bg-white/[.02] p-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: folder.color }} />
                <span className="min-w-0 flex-1 truncate font-medium text-[var(--text)]">{folder.name}</span>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-[10px] text-indigo-200 hover:bg-white/[.06]"
                  onClick={() => {
                    const next = window.prompt("Rename folder", folder.name);
                    if (next?.trim()) void onRenameFolder(folder.id, next);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-rose-200 hover:bg-rose-500/10"
                  aria-label={`Delete ${folder.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete folder "${folder.name}"?`)) void onDeleteFolder(folder.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-4 w-4 rounded-full border ${folder.color === color ? "border-white" : "border-white/10"}`}
                    style={{ background: color }}
                    title="Set color"
                    onClick={() => void onSetFolderColor(folder.id, color)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
