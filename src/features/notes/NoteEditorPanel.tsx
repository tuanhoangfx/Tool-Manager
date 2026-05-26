import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Copy,
  FolderOpen,
  Hash,
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
import { NoteCookieSnapshotBlock } from "./NoteCookieSnapshotBlock";
import { cookieLines } from "./noteUtils";
import { buildShareUrl } from "./shareUtils";
import type { NoteRow } from "./types";

type Props = {
  note: NoteRow | null;
  loading?: boolean;
  title: string;
  slug: string;
  domain: string;
  pinned: boolean;
  shareEnabled: boolean;
  sharePassword: string;
  body: string;
  saving?: boolean;
  creating?: boolean;
  savedHint?: string;
  actionError?: string;
  folders: NoteFolder[];
  currentFolderId: string | null;
  folderFilterId: string | null;
  onTitleChange: (v: string) => void;
  onPinnedToggle: () => void;
  onShareToggle: () => void;
  onSharePasswordChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onSlugFromTitle: () => void;
  onCreateFolder: (name: string) => Promise<void>;
  onSelectFolder: (folderId: string | null) => Promise<void>;
  onFolderFilterChange: (folderId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onSetFolderColor: (folderId: string, color: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
};

export function NoteEditorPanel({
  note,
  loading,
  title,
  slug,
  pinned,
  shareEnabled,
  sharePassword,
  body,
  saving,
  creating,
  savedHint,
  actionError,
  folders,
  currentFolderId,
  folderFilterId,
  onTitleChange,
  onPinnedToggle,
  onShareToggle,
  onSharePasswordChange,
  onBodyChange,
  onNew,
  onSave,
  onDelete,
  onSlugFromTitle,
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
  const updatedLabel = note?.updated_at ? formatShortDate(note.updated_at) : "";
  const shareUrl = note?.share_token && shareEnabled ? buildShareUrl(note.share_token) : "";
  const cookieSnapshotLines = note ? cookieLines(note.cookie_snapshot) : [];
  const showCookieSnapshot = Boolean(note && (cookieSnapshotLines.length > 0 || note.sync_status === "synced"));

  return (
    <section className="notes-editor flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10">
      <div className="notes-editor__header flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="min-w-[14rem] flex-1">
          <input
            className="notes-editor__title w-full min-w-0 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
            value={title}
            placeholder="Untitled"
            aria-label="Note title"
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => {
              if (!slug.trim()) onSlugFromTitle();
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {loading ? <NoteMetaBadge icon={<Clock3 size={12} />} label="Loading note" tone="muted" /> : null}
            {note?.id ? (
              <CopyMetaBadge icon={<Hash size={12} />} label={`ID ${shortId(note.id)}`} value={note.id} tone="muted" />
            ) : null}
            {updatedLabel ? <NoteMetaBadge icon={<CalendarClock size={12} />} label={`Updated ${updatedLabel}`} tone="muted" /> : null}
          </div>
        </div>
        <div className="notes-editor__actions flex flex-wrap items-center gap-2">
          {savedHint ? <span className="text-[11px] text-emerald-300">{savedHint}</span> : null}
          <HeaderActionButton
            icon={<Plus size={13} />}
            label={creating ? "Creating..." : "New"}
            tone="indigo"
            disabled={creating}
            onClick={onNew}
          />
          <div className="relative">
            <HeaderActionButton
              icon={<FolderOpen size={13} />}
              label={folderName(folders, currentFolderId) ?? "Folder"}
              tone="amber"
              title="Choose and manage folder"
              onClick={() => setFolderOpen((v) => !v)}
            />
            {folderOpen ? (
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
          <HeaderActionButton
            icon={<Pin size={13} />}
            label={pinned ? "Pinned" : "Pin"}
            tone="violet"
            active={pinned}
            onClick={onPinnedToggle}
          />
          <div className="relative">
            <HeaderActionButton
              icon={shareEnabled ? <Share2 size={13} /> : <Lock size={13} />}
              label={shareEnabled ? "Shared" : "Private"}
              tone="cyan"
              active={shareEnabled}
              onClick={() => setShareOpen((v) => !v)}
            />
            {shareOpen ? (
              <ShareMenu
                enabled={shareEnabled}
                shareUrl={shareUrl}
                password={sharePassword}
                onPasswordChange={onSharePasswordChange}
                onToggle={onShareToggle}
              />
            ) : null}
          </div>
          <HeaderActionButton icon={<Trash2 size={13} />} label="Delete" tone="rose" onClick={onDelete} />
          <HeaderActionButton
            icon={<Save size={13} />}
            label={saving ? "Saving..." : "Save"}
            tone="emerald"
            disabled={saving}
            onClick={onSave}
          />
        </div>
      </div>

      {actionError ? (
        <p className="shrink-0 border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-[11px] text-rose-200">
          {actionError}
        </p>
      ) : null}

      <div className="notes-editor__body min-h-0 flex-1 overflow-y-auto p-4">
        {showCookieSnapshot ? (
          <div className="mb-3">
            <NoteCookieSnapshotBlock
              lines={cookieSnapshotLines}
              syncStatus={note?.sync_status ?? "pending"}
              syncedAt={note?.synced_at ?? null}
              bodyMd={body}
              onInsertIntoMarkdown={onBodyChange}
            />
          </div>
        ) : null}
        <textarea
          className="notes-editor__textarea min-h-[14rem] w-full resize-none rounded-lg p-4 font-sans text-[13px] leading-relaxed outline-none"
          placeholder="Write markdown…"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          onBlur={() => {
            if (!title.trim()) onSlugFromTitle();
          }}
        />
      </div>
    </section>
  );
}

type NoteMetaTone = "amber" | "cyan" | "emerald" | "indigo" | "muted" | "rose";

function NoteMetaBadge({
  icon,
  label,
  tone,
}: {
  icon: ReactNode;
  label: string;
  tone: NoteMetaTone;
}) {
  const toneClass = {
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    cyan: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
    emerald: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    indigo: "border-indigo-400/25 bg-indigo-400/10 text-indigo-200",
    muted: "border-white/10 bg-white/[.04] text-[var(--muted)]",
    rose: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  }[tone];

  return (
    <span className={`note-meta-badge inline-flex max-w-[16rem] items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-4 ${toneClass}`}>
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function CopyMetaBadge({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: NoteMetaTone;
}) {
  const { pushToast } = useAppToast();
  return (
    <button
      type="button"
      title={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard?.writeText(value);
        pushToast(`Copied ${label}`, "success");
      }}
      className="group"
    >
      <NoteMetaBadge
        icon={
          <span className="inline-flex items-center gap-1">
            {icon}
            <Copy size={10} className="opacity-55 transition-opacity group-hover:opacity-100" />
          </span>
        }
        label={label}
        tone={tone}
      />
    </button>
  );
}

type HeaderActionTone = "amber" | "cyan" | "emerald" | "indigo" | "rose" | "violet";

function HeaderActionButton({
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
  tone: HeaderActionTone;
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
      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${toneClass} ${
        active ? "ring-1 ring-current/30" : ""
      }`}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {icon}
      {label}
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
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            Default is private. Enable public share to generate a link.
          </p>
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

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
