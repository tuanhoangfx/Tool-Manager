import { AlertCircle, CalendarPlus, CheckCircle2, Clock3, Globe2, Hash, Pin, RefreshCw } from "lucide-react";
import { CopyMetaChip, MetaChip, type MetaTone } from "@tool-workspace/hub-ui";
import { NoteEditorTitleOnlyBadge } from "./NoteEditorRouteTitleActions";
import { formatNoteTimestamp } from "./noteUtils";
import type { NoteRow, NoteSyncStatus } from "./types";

type Props = {
  note: NoteRow | null;
  loading?: boolean;
  hideDomain?: boolean;
  routeLocked?: boolean;
};

const NOTE_COPY_CHIP_CLASS = "text-[11px] leading-[1.25]";

/** Editor header meta chips (sync, domain, pin, id). */
export function NoteEditorMetaStrip({ note, loading, hideDomain = false, routeLocked = false }: Props) {
  if (!note && !loading && !routeLocked) return null;

  const syncTone: MetaTone =
    note?.sync_status === "synced" ? "emerald" : note?.sync_status === "error" ? "rose" : "amber";
  const syncStatusLabel = note ? syncStatusShort(note.sync_status) : "";
  const syncId = note?.sync_id?.trim() ?? "";
  const slug = note?.slug?.trim() ?? "";
  const noteId = note?.id?.trim() ?? "";

  return (
    <div className="ml-auto flex min-h-[1.625rem] min-w-[5.5rem] shrink-0 flex-wrap items-center justify-end gap-1.5">
      {routeLocked ? <NoteEditorTitleOnlyBadge /> : null}
      {loading ? <MetaChip icon={<Clock3 size={11} />} label="Loading" tone="indigo" /> : null}
      {note?.domain?.trim() && !hideDomain ? (
        <MetaChip icon={<Globe2 size={11} />} label={note.domain.trim()} tone="cyan" title="Cookie domain" />
      ) : null}
      {syncStatusLabel ? (
        <MetaChip
          icon={note?.sync_status === "error" ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
          label={syncStatusLabel}
          tone={syncTone}
          title="Sync status"
        />
      ) : null}
      {note?.pinned ? <MetaChip icon={<Pin size={11} />} label="Pinned" tone="amber" /> : null}
      {note?.created_at ? (
        <MetaChip
          icon={<CalendarPlus size={11} />}
          label={formatNoteTimestamp(note.created_at)}
          tone="muted"
          title={`Created ${formatNoteTimestamp(note.created_at)}`}
          className="max-w-[9.5rem]"
        />
      ) : null}
      {slug ? (
        <CopyMetaChip
          icon={<Hash size={11} />}
          label={slug.length > 18 ? `${slug.slice(0, 16)}…` : slug}
          value={slug}
          tone="violet"
          title="Copy slug"
          className={`max-w-[10rem] ${NOTE_COPY_CHIP_CLASS}`}
        />
      ) : null}
      {syncId ? (
        <CopyMetaChip
          icon={<RefreshCw size={11} />}
          label={syncId.length > 14 ? `${syncId.slice(0, 12)}…` : syncId}
          value={syncId}
          tone="cyan"
          title="Copy sync ID"
          className={`max-w-[11rem] font-mono ${NOTE_COPY_CHIP_CLASS}`}
        />
      ) : null}
      {noteId ? (
        <CopyMetaChip
          icon={<Hash size={11} />}
          label={noteId.length > 12 ? `${noteId.slice(0, 8)}…` : noteId}
          value={noteId}
          tone="indigo"
          title="Copy note ID"
          className={`max-w-[11rem] font-mono ${NOTE_COPY_CHIP_CLASS}`}
        />
      ) : null}
    </div>
  );
}

function syncStatusShort(status: NoteSyncStatus): string {
  switch (status) {
    case "synced":
      return "Synced";
    case "pending":
      return "Pending";
    case "error":
      return "Sync error";
    default:
      return "Manual";
  }
}
