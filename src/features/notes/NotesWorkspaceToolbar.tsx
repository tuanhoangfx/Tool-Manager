import { Lock, Pin, Plus, Save, Share2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useAppToast } from "../../components/toast";
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
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPinnedToggle: () => void;
  onShareToggle: () => void;
  onSharePasswordChange: (v: string) => void;
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
  onNew,
  onSave,
  onDelete,
  onPinnedToggle,
  onShareToggle,
  onSharePasswordChange,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const shareUrl = note?.share_token && shareEnabled ? buildShareUrl(note.share_token) : "";
  const hasNote = Boolean(note?.id);

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {savedHint ? <span className="hidden text-[10px] text-emerald-300 sm:inline">{savedHint}</span> : null}
      <ToolbarButton icon={<Plus size={12} />} label={creating ? "Creating…" : "New"} tone="indigo" disabled={creating} onClick={onNew} />
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

type ToolbarTone = "cyan" | "emerald" | "indigo" | "rose" | "violet";

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
