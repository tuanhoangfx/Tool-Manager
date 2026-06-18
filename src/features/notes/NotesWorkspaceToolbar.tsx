import { Eye, History, Lock, PenLine, Plus, Save, Share2, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  HubBulkActionButton,
  HubDirectoryBulkActionRail,
  type HubBulkActionTone,
} from "@tool-workspace/hub-ui";
import { useAppToast } from "../../components/toast";
import { shareAccessLabel, type NoteShareAccess } from "./shareAccess";
import { buildShareUrl } from "./shareUtils";
import type { NoteRow } from "./types";

type Props = {
  note: NoteRow | null;
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
  onHistoryToggle?: () => void;
  onHistoryHover?: () => void;
  onShareDraftAccessChange: (access: NoteShareAccess) => void;
  onShareDraftPasswordChange: (v: string) => void;
  onShareSave: () => void;
  onShareCancel: () => void;
  onShareMenuOpen?: () => void;
  /** Render buttons only — share one `HubDirectoryBulkActionRail` with folder bulk. */
  embedded?: boolean;
};

/** Filter row 2 — golden HubBulkActionButton rail (parity with 2FA directory bulk bar). */
export function NotesWorkspaceToolbar({
  note,
  shareAccess,
  shareDraftAccess,
  shareDraftPassword,
  saving,
  creating,
  saveAcknowledged,
  routeLocked = false,
  historyDisabled = false,
  historyVersionCount = 0,
  historyBadgePulse = false,
  onNew,
  onSave,
  onDelete,
  onHistoryToggle,
  onHistoryHover,
  onShareDraftAccessChange,
  onShareDraftPasswordChange,
  onShareSave,
  onShareCancel,
  onShareMenuOpen,
  embedded = false,
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

  const shareTone: HubBulkActionTone =
    shareAccess === "edit" ? "indigo" : shareAccess === "view" ? "sky" : "neutral";

  const buttons = (
    <>
      <HubBulkActionButton
        icon={<Plus size={14} aria-hidden />}
        label={creating ? "Creating…" : "New"}
        title="Create a new note"
        tone="indigo"
        disabled={creating}
        onClick={onNew}
      />
      <HubBulkActionButton
        icon={<Save size={14} aria-hidden />}
        label={saving ? "Saving…" : saveAcknowledged && !saving ? "Saved" : "Save"}
        title="Save note"
        tone="emerald"
        disabled={!hasNote || saving}
        onClick={onSave}
      />
      <div ref={shareWrapRef} className="relative">
        <HubBulkActionButton
          icon={
            shareAccess === "edit" ? (
              <PenLine size={14} aria-hidden />
            ) : shareAccess === "view" ? (
              <Eye size={14} aria-hidden />
            ) : (
              <Lock size={14} aria-hidden />
            )
          }
          label={shareAccessLabel(shareAccess)}
          title="Share note"
          tone={shareTone}
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
      <HubBulkActionButton
        icon={<Trash2 size={14} aria-hidden />}
        label="Delete"
        title="Delete note"
        tone="rose"
        disabled={!hasNote}
        onClick={onDelete}
      />
      <div onMouseEnter={() => onHistoryHover?.()} onFocus={() => onHistoryHover?.()}>
        <HubBulkActionButton
          icon={<History size={14} aria-hidden />}
          label="History"
          title={historyDisabled ? "History unavailable offline" : "Note version history"}
          tone={historyBadgePulse ? "emerald" : "indigo"}
          disabled={!hasNote || historyDisabled}
          selectedCount={hasNote && historyVersionCount > 0 ? historyVersionCount : undefined}
          onClick={() => onHistoryToggle?.()}
        />
      </div>
    </>
  );

  if (embedded) return buttons;

  return <HubDirectoryBulkActionRail>{buttons}</HubDirectoryBulkActionRail>;
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
