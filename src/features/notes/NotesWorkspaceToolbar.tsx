import { Eye, History, Lock, PenLine, Pin, Plus, Save, Share2, Trash2, Check } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useAppToast } from "../../components/toast";
import { shareAccessLabel, type NoteShareAccess } from "./shareAccess";
import { buildShareUrl } from "./shareUtils";
import type { NoteRow } from "./types";

type Props = {
  note: NoteRow | null;
  pinned: boolean;
  shareAccess: NoteShareAccess;
  shareDraftAccess: NoteShareAccess;
  shareDraftPassword: string;
  saving?: boolean;
  creating?: boolean;
  saveAcknowledged?: boolean;
  routeLocked?: boolean;
  historyOpen?: boolean;
  historyDisabled?: boolean;
  historyVersionCount?: number;
  historyBadgePulse?: boolean;
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPinnedToggle: () => void;
  onHistoryToggle?: () => void;
  onHistoryHover?: () => void;
  onShareDraftAccessChange: (access: NoteShareAccess) => void;
  onShareDraftPasswordChange: (v: string) => void;
  onShareSave: () => void;
  onShareCancel: () => void;
  onShareMenuOpen?: () => void;
};

export function NotesWorkspaceToolbar({
  note,
  pinned,
  shareAccess,
  shareDraftAccess,
  shareDraftPassword,
  saving,
  creating,
  saveAcknowledged,
  routeLocked = false,
  historyOpen = false,
  historyDisabled = false,
  historyVersionCount = 0,
  historyBadgePulse = false,
  onNew,
  onSave,
  onDelete,
  onPinnedToggle,
  onHistoryToggle,
  onHistoryHover,
  onShareDraftAccessChange,
  onShareDraftPasswordChange,
  onShareSave,
  onShareCancel,
  onShareMenuOpen,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const shareWrapRef = useRef<HTMLDivElement>(null);
  const linkActive = shareAccess !== "private";
  const hasNote = Boolean(note?.id);

  const openShareMenu = (open: boolean) => {
    setShareOpen(open);
    if (open) onShareMenuOpen?.();
  };

  useEffect(() => {
    if (!shareOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (shareWrapRef.current && !shareWrapRef.current.contains(e.target as Node)) {
        setShareOpen(false);
        onShareCancel();
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [onShareCancel, shareOpen]);

  const shareDirty =
    shareDraftAccess !== shareAccess || shareDraftPassword.trim().length > 0;

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <ToolbarButton icon={<Plus size={12} />} label={creating ? "Creating…" : "New"} tone="indigo" disabled={creating} onClick={onNew} />
      <ToolbarButton
        icon={<Save size={12} />}
        label={saving ? "Saving…" : "Save"}
        tone="emerald"
        disabled={!hasNote || saving}
        onClick={onSave}
        trailing={
          saveAcknowledged && !saving ? (
            <Check size={11} className="text-emerald-300 anim-pop" aria-hidden />
          ) : null
        }
      />
      <ToolbarButton
        icon={<Pin size={12} />}
        label={pinned ? "Pinned" : "Pin"}
        tone="violet"
        active={pinned}
        disabled={!hasNote || routeLocked}
        onClick={onPinnedToggle}
      />
      <div ref={shareWrapRef} className="relative">
        <ToolbarButton
          icon={shareAccess === "edit" ? <PenLine size={12} /> : shareAccess === "view" ? <Eye size={12} /> : <Lock size={12} />}
          label={shareAccessLabel(shareAccess)}
          tone={shareAccess === "edit" ? "violet" : shareAccess === "view" ? "cyan" : "indigo"}
          active={linkActive}
          disabled={!hasNote || routeLocked}
          onClick={() => openShareMenu(!shareOpen)}
        />
        {shareOpen && hasNote ? (
          <ShareMenu
            draftAccess={shareDraftAccess}
            committedAccess={shareAccess}
            shareUrl={note?.share_token && shareDraftAccess !== "private" ? buildShareUrl(note.share_token) : ""}
            password={shareDraftPassword}
            saving={saving}
            dirty={shareDirty}
            onPasswordChange={onShareDraftPasswordChange}
            onSelectAccess={onShareDraftAccessChange}
            onSave={() => void onShareSave()}
            onCancel={() => {
              onShareCancel();
              setShareOpen(false);
            }}
          />
        ) : null}
      </div>
      <ToolbarButton icon={<Trash2 size={12} />} label="Delete" tone="rose" disabled={!hasNote} onClick={onDelete} />
      <div
        className="relative"
        onMouseEnter={() => onHistoryHover?.()}
        onFocus={() => onHistoryHover?.()}
      >
        <ToolbarButton
          icon={<History size={12} />}
          label="History"
          tone="indigo"
          active={historyOpen}
          disabled={!hasNote || historyDisabled}
          onClick={() => onHistoryToggle?.()}
        />
        {hasNote && historyVersionCount > 0 ? (
          <span
            className={`pointer-events-none absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border px-0.5 text-[9px] font-bold leading-none ${
              historyBadgePulse
                ? "border-emerald-400/50 bg-emerald-500/90 text-white anim-pop"
                : "border-indigo-400/35 bg-indigo-500/85 text-indigo-50"
            }`}
            aria-hidden
          >
            {historyVersionCount > 99 ? "99+" : historyVersionCount}
          </span>
        ) : null}
      </div>
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
  onClick,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  tone: ToolbarTone;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  trailing?: ReactNode;
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
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {trailing}
    </button>
  );
}

function ShareMenu({
  draftAccess,
  committedAccess,
  shareUrl,
  password,
  saving,
  dirty,
  onPasswordChange,
  onSelectAccess,
  onSave,
  onCancel,
}: {
  draftAccess: NoteShareAccess;
  committedAccess: NoteShareAccess;
  shareUrl: string;
  password: string;
  saving?: boolean;
  dirty: boolean;
  onPasswordChange: (v: string) => void;
  onSelectAccess: (access: NoteShareAccess) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { pushToast } = useAppToast();
  const linkActive = draftAccess !== "private";
  const linkDisplay = shareUrl || (linkActive && saving ? "…" : linkActive ? "Save to generate link" : "");

  return (
    <div
      className="anim-pop absolute right-0 top-full z-50 mt-1.5 w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border border-white/10 bg-[var(--panel)] p-2.5 shadow-2xl shadow-black/45"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text)]">
        <Share2 size={11} className="text-cyan-300" aria-hidden />
        Share note
      </div>

      <div className="mb-2 flex gap-0.5 rounded-md border border-white/10 bg-white/[.03] p-0.5" role="group" aria-label="Share level">
        <ShareModeButton
          active={draftAccess === "private"}
          tone="private"
          icon={<Lock size={10} />}
          label="Only me"
          disabled={saving}
          onClick={() => onSelectAccess("private")}
        />
        <ShareModeButton
          active={draftAccess === "view"}
          tone="view"
          icon={<Eye size={10} />}
          label="View"
          disabled={saving}
          onClick={() => onSelectAccess("view")}
        />
        <ShareModeButton
          active={draftAccess === "edit"}
          tone="edit"
          icon={<PenLine size={10} />}
          label="Edit"
          disabled={saving}
          onClick={() => onSelectAccess("edit")}
        />
      </div>

      <div className="min-h-[4.75rem] space-y-2">
        <input
          className={`field h-7 text-[11px] transition-opacity ${linkActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
          type="password"
          name="p0020-note-share-password"
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore
          tabIndex={linkActive ? 0 : -1}
          aria-hidden={!linkActive}
          value={password}
          placeholder="Password (optional)"
          onChange={(e) => onPasswordChange(e.target.value)}
        />
        <div
          className={`flex gap-1.5 transition-opacity ${linkActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
          aria-hidden={!linkActive}
        >
          <input
            className="field h-7 min-w-0 flex-1 font-mono text-[9px]"
            readOnly
            tabIndex={-1}
            name="p0020-note-share-url"
            autoComplete="off"
            data-form-type="other"
            value={linkDisplay}
          />
          <button
            type="button"
            className="btn h-7 shrink-0 px-2 text-[10px]"
            disabled={!shareUrl || saving}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (!shareUrl) return;
              void navigator.clipboard?.writeText(shareUrl);
              pushToast("Copied share link", "success");
            }}
          >
            Copy
          </button>
        </div>
      </div>

      <div className="mt-2 flex justify-end gap-1.5 border-t border-white/5 pt-2">
        <button
          type="button"
          className="inline-flex h-7 items-center rounded-lg border border-white/10 px-2.5 text-[10px] font-semibold text-[var(--muted)] hover:bg-white/[.04] hover:text-[var(--text)]"
          disabled={saving}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2.5 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/22 disabled:opacity-50"
          disabled={saving || (!dirty && draftAccess === committedAccess)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSave}
        >
          <Save size={11} aria-hidden />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function ShareModeButton({
  active,
  tone,
  icon,
  label,
  disabled,
  onClick,
}: {
  active: boolean;
  tone: "private" | "view" | "edit";
  icon: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const styles = {
    private: {
      active: "border-slate-400/45 bg-slate-500/22 text-slate-100",
      idle: "border-transparent text-slate-400 hover:bg-slate-500/10 hover:text-slate-200",
    },
    view: {
      active: "border-cyan-400/45 bg-cyan-500/20 text-cyan-50",
      idle: "border-transparent text-cyan-400/80 hover:bg-cyan-500/10 hover:text-cyan-100",
    },
    edit: {
      active: "border-violet-400/45 bg-violet-500/20 text-violet-50",
      idle: "border-transparent text-violet-400/80 hover:bg-violet-500/10 hover:text-violet-100",
    },
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex h-6 flex-1 items-center justify-center gap-0.5 rounded px-1 text-[9px] font-semibold transition-colors disabled:opacity-50 ${
        active ? styles.active : styles.idle
      }`}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) onClick();
      }}
    >
      {icon}
      {label}
    </button>
  );
}
