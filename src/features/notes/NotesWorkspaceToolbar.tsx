import {
  CheckCircle2,
  FolderOpen,
  Lock,
  Pin,
  Plus,
  Save,
  Share2,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAppToast } from "../../components/toast";
import type { NoteFolder } from "./noteFolders";
import { buildShareUrl } from "./shareUtils";
import type { NoteRow } from "./types";

type Props = {
  note: NoteRow | null;
  pinned: boolean;
  shareEnabled: boolean;
  sharePassword: string;
  saving?: boolean;
  creating?: boolean;
  savedHint?: string;
  routeLocked?: boolean;
  folders: NoteFolder[];
  currentFolderId: string | null;
  folderFilterId: string | null;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPinnedToggle: () => void;
  onShareToggle: () => void;
  onSharePasswordChange: (v: string) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onSelectFolder: (folderId: string | null) => Promise<void>;
  onFolderFilterChange: (folderId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onSetFolderColor: (folderId: string, color: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
};

export function NotesWorkspaceToolbar({
  note,
  pinned,
  shareEnabled,
  sharePassword,
  saving,
  creating,
  savedHint,
  routeLocked = false,
  folders,
  currentFolderId,
  folderFilterId,
  onNew,
  onSave,
  onDelete,
  onPinnedToggle,
  onShareToggle,
  onSharePasswordChange,
  onCreateFolder,
  onSelectFolder,
  onFolderFilterChange,
  onRenameFolder,
  onSetFolderColor,
  onDeleteFolder,
}: Props) {
  const [folderOpen, setFolderOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const shareUrl = note?.share_token && shareEnabled ? buildShareUrl(note.share_token) : "";
  const hasNote = Boolean(note?.id);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {savedHint ? <span className="hidden text-[10px] text-emerald-300 sm:inline">{savedHint}</span> : null}
      <ToolbarButton icon={<Plus size={12} />} label={creating ? "Creating…" : "New"} tone="indigo" disabled={creating} onClick={onNew} />
      <div className="relative">
        <ToolbarButton
          icon={<FolderOpen size={12} />}
          label={folderName(folders, currentFolderId) ?? "Folder"}
          tone="amber"
          disabled={!hasNote || routeLocked}
          title={routeLocked ? "Folder disabled while Cookie route is active" : "Folder"}
          onClick={() => setFolderOpen((v) => !v)}
        />
        {folderOpen && hasNote ? (
          <FolderMenu
            folders={folders}
            currentFolderId={currentFolderId}
            filterId={folderFilterId}
            newFolderName={newFolderName}
            onNewFolderNameChange={setNewFolderName}
            onCreate={() => {
              void onCreateFolder(newFolderName);
              setNewFolderName("");
            }}
            onSelectFolder={onSelectFolder}
            onFilterChange={onFolderFilterChange}
            onRenameFolder={onRenameFolder}
            onSetFolderColor={onSetFolderColor}
            onDeleteFolder={onDeleteFolder}
          />
        ) : null}
      </div>
      <ToolbarButton
        icon={<Pin size={12} />}
        label={pinned ? "Pinned" : "Pin"}
        tone="violet"
        active={pinned}
        disabled={!hasNote || routeLocked}
        onClick={onPinnedToggle}
      />
      <div className="relative">
        <ToolbarButton
          icon={shareEnabled ? <Share2 size={12} /> : <Lock size={12} />}
          label={shareEnabled ? "Shared" : "Private"}
          tone="cyan"
          active={shareEnabled}
          disabled={!hasNote || routeLocked}
          onClick={() => setShareOpen((v) => !v)}
        />
        {shareOpen && hasNote ? (
          <ShareMenu
            enabled={shareEnabled}
            shareUrl={shareUrl}
            password={sharePassword}
            onPasswordChange={onSharePasswordChange}
            onToggle={onShareToggle}
          />
        ) : null}
      </div>
      <ToolbarButton icon={<Trash2 size={12} />} label="Delete" tone="rose" disabled={!hasNote} onClick={onDelete} />
      <ToolbarButton
        icon={<Save size={12} />}
        label={saving ? "Saving…" : "Save"}
        tone="emerald"
        disabled={!hasNote || saving}
        onClick={onSave}
      />
    </div>
  );
}

type ToolbarTone = "amber" | "cyan" | "emerald" | "indigo" | "rose" | "violet";

function ToolbarButton({
  icon,
  label,
  tone,
  active,
  disabled,
  title,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  tone: ToolbarTone;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  const toneClass = {
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/16",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/16",
    indigo: "border-indigo-400/30 bg-indigo-400/12 text-indigo-100 hover:bg-indigo-400/18",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-100 hover:bg-rose-400/16",
    violet: "border-violet-400/30 bg-violet-400/10 text-violet-100 hover:bg-violet-400/16",
  }[tone];

  return (
    <button
      type="button"
      className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass} ${
        active ? "ring-1 ring-current/30" : ""
      }`}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function FolderMenu({
  folders,
  currentFolderId,
  filterId,
  newFolderName,
  onNewFolderNameChange,
  onCreate,
  onSelectFolder,
  onFilterChange,
  onRenameFolder,
  onSetFolderColor,
  onDeleteFolder,
}: {
  folders: NoteFolder[];
  currentFolderId: string | null;
  filterId: string | null;
  newFolderName: string;
  onNewFolderNameChange: (v: string) => void;
  onCreate: () => void;
  onSelectFolder: (folderId: string | null) => void;
  onFilterChange: (folderId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onSetFolderColor: (folderId: string, color: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
}) {
  return (
    <div className="anim-pop absolute right-0 top-full z-50 mt-1.5 w-72 rounded-xl border border-white/10 bg-[var(--panel)] p-3 shadow-2xl shadow-black/45">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Note folder</div>
      <div className="space-y-1">
        <FolderOption active={!currentFolderId} color="#64748b" label="No folder" onClick={() => onSelectFolder(null)} />
        {folders.map((folder) => (
          <div key={folder.id} className="rounded-lg border border-white/5 bg-white/[.02] p-1">
            <FolderOption
              active={currentFolderId === folder.id}
              color={folder.color}
              label={folder.name}
              onClick={() => onSelectFolder(folder.id)}
            />
            <div className="mt-1 flex flex-wrap items-center gap-1 px-1 pb-1">
              {FOLDER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-4 w-4 rounded-full border ${folder.color === color ? "border-white" : "border-white/10"}`}
                  style={{ background: color }}
                  title="Set folder color"
                  onClick={() => void onSetFolderColor(folder.id, color)}
                />
              ))}
              <button
                type="button"
                className="ml-auto rounded px-1.5 py-0.5 text-[10px] text-indigo-200 hover:bg-white/[.06]"
                onClick={() => {
                  const next = window.prompt("Rename folder", folder.name);
                  if (next?.trim()) void onRenameFolder(folder.id, next);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="rounded px-1.5 py-0.5 text-[10px] text-rose-200 hover:bg-rose-500/10"
                onClick={() => {
                  if (window.confirm(`Delete folder "${folder.name}"?`)) void onDeleteFolder(folder.id);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="field h-8 min-w-0 flex-1 text-[11px]"
          value={newFolderName}
          placeholder="New folder name"
          onChange={(e) => onNewFolderNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCreate();
          }}
        />
        <button type="button" className="btn text-[11px] !px-2" onClick={onCreate}>
          Add
        </button>
      </div>
      <div className="my-3 border-t border-white/5" />
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Filter list</div>
      <div className="space-y-1">
        <FolderOption active={!filterId} color="#64748b" label="All folders" onClick={() => onFilterChange(null)} />
        {folders.map((folder) => (
          <FolderOption
            key={`filter-${folder.id}`}
            active={filterId === folder.id}
            color={folder.color}
            label={folder.name}
            onClick={() => onFilterChange(folder.id)}
          />
        ))}
      </div>
    </div>
  );
}

const FOLDER_COLORS = ["#818cf8", "#22d3ee", "#f59e0b", "#a78bfa", "#34d399", "#fb7185"];

function ShareMenu({
  enabled,
  shareUrl,
  password,
  onPasswordChange,
  onToggle,
}: {
  enabled: boolean;
  shareUrl: string;
  password: string;
  onPasswordChange: (v: string) => void;
  onToggle: () => void;
}) {
  const { pushToast } = useAppToast();
  return (
    <div className="anim-pop absolute right-0 top-full z-50 mt-1.5 w-80 rounded-xl border border-white/10 bg-[var(--panel)] p-3 shadow-2xl shadow-black/45">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Share settings</div>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">Enable public share to generate a link.</p>
        </div>
        <button
          type="button"
          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
            enabled
              ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
              : "border-white/10 bg-white/[.04] text-[var(--muted)]"
          }`}
          onClick={onToggle}
        >
          {enabled ? "Public" : "Private"}
        </button>
      </div>
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Password</label>
      <input
        className="field mb-3 h-8 text-[11px]"
        type="password"
        value={password}
        placeholder="Optional share password"
        onChange={(e) => onPasswordChange(e.target.value)}
      />
      <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--muted)]">Share link</label>
      <div className="flex gap-2">
        <input
          className="field h-8 min-w-0 flex-1 text-[11px]"
          readOnly
          value={enabled ? shareUrl || "Save once to generate link" : "Private note"}
        />
        <button
          type="button"
          className="btn text-[11px] !px-2"
          disabled={!shareUrl}
          onClick={() => {
            void navigator.clipboard?.writeText(shareUrl);
            pushToast("Copied share link", "success");
          }}
        >
          Copy
        </button>
      </div>
    </div>
  );
}

function FolderOption({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] transition-colors ${
        active ? "bg-white/[.08] text-[var(--text)]" : "text-[var(--muted)] hover:bg-white/[.05] hover:text-[var(--text)]"
      }`}
      onClick={onClick}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active ? <CheckCircle2 size={12} className="text-emerald-300" /> : null}
    </button>
  );
}

function folderName(folders: NoteFolder[], folderId: string | null) {
  if (!folderId) return null;
  return folders.find((f) => f.id === folderId)?.name ?? null;
}
