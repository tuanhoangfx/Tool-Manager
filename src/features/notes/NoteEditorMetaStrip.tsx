import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Globe2,
  Hash,
  Pin,
} from "lucide-react";
import { CopyMetaChip, MetaChip, type MetaTone } from "../../components/CopyMetaChip";
import { NoteEditorTitleOnlyBadge } from "./NoteEditorRouteTitleActions";
import { syncMeta } from "./noteUtils";
import type { NoteRow } from "./types";

type Props = {
  note: NoteRow | null;
  loading?: boolean;
  hideDomain?: boolean;
  routeLocked?: boolean;
};

/** Editor header meta chips (sync, domain, pin, id). */
export function NoteEditorMetaStrip({ note, loading, hideDomain = false, routeLocked = false }: Props) {
  if (!note && !loading && !routeLocked) return null;

  const sync = note ? syncMeta(note.sync_status, note.synced_at) : null;
  const syncTone: MetaTone =
    sync?.syncTone === "emerald" ? "emerald" : sync?.syncTone === "rose" ? "rose" : "amber";
  const updatedLabel = note?.updated_at ? formatShortDate(note.updated_at) : "";

  return (
    <div className="ml-auto flex min-h-[1.625rem] min-w-[5.5rem] shrink-0 flex-wrap items-center justify-end gap-1.5">
      {routeLocked ? <NoteEditorTitleOnlyBadge /> : null}
      {loading ? <MetaChip icon={<Clock3 size={11} />} label="Loading" tone="indigo" /> : null}
      {note?.domain?.trim() && !hideDomain ? (
        <MetaChip icon={<Globe2 size={11} />} label={note.domain.trim()} tone="cyan" title="Cookie domain" />
      ) : null}
      {sync ? (
        <MetaChip
          icon={note?.sync_status === "error" ? <AlertCircle size={11} /> : <CheckCircle2 size={11} />}
          label={sync.syncLabel}
          tone={syncTone}
          title="Sync status"
        />
      ) : null}
      {note?.pinned ? <MetaChip icon={<Pin size={11} />} label="Pinned" tone="amber" /> : null}
      {updatedLabel ? (
        <MetaChip icon={<CalendarClock size={11} />} label={updatedLabel} tone="emerald" title="Last updated" />
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

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
