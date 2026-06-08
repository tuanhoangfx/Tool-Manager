import { AlertCircle, CalendarPlus, CheckCircle2, Clock3, Globe2, Hash, Pin } from "lucide-react";
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

/** Editor header meta chips (sync, domain, pin, id). */
export function NoteEditorMetaStrip({ note, loading, hideDomain = false, routeLocked = false }: Props) {
  if (!note && !loading && !routeLocked) return null;

  const syncTone: MetaTone =
    note?.sync_status === "synced" ? "emerald" : note?.sync_status === "error" ? "rose" : "amber";
  const syncStatusLabel = note ? syncStatusShort(note.sync_status) : "";

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
      {note?.id ? (
        <CopyMetaChip
          icon={<Hash size={11} />}
          label={note.id}
          value={note.id}
          tone="indigo"
          title="Copy note ID"
          className="ml-0.5 max-w-[13rem] font-mono text-[9px] tracking-tight"
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
