import { DEFAULT_NOTES_VERSION_INTERVAL_MINUTES } from "./notes-version-prefs";

export type NoteVersionSource = "session" | "interval" | "manual" | "restore" | "save";

export type NoteVersionListItem = {
  id: string;
  note_id: string;
  title: string;
  body_preview: string;
  /** Full body when under list cap; truncated prefix when body_truncated. */
  body_md: string;
  body_truncated: boolean;
  body_length: number;
  content_hash: string;
  source: NoteVersionSource;
  label: string | null;
  created_at: string;
};

export type NoteVersionDetail = {
  id: string;
  note_id: string;
  title: string;
  body_md: string;
  content_hash: string;
  source: NoteVersionSource;
  label: string | null;
  created_at: string;
};

export const NOTE_VERSION_SOURCE_BADGE: Record<
  NoteVersionSource,
  { label: string; tone: "indigo" | "emerald" | "amber" | "rose" | "slate" }
> = {
  manual: { label: "Checkpoint", tone: "indigo" },
  session: { label: "Session", tone: "slate" },
  interval: { label: "Auto", tone: "amber" },
  save: { label: "Save", tone: "emerald" },
  restore: { label: "Pre-restore", tone: "rose" },
};

/** Design V4 — emoji map for Inspector / mobile (Settings-style TOC). */
export const NOTE_VERSION_SOURCE_EMOJI: Record<NoteVersionSource, { emoji: string; label: string }> = {
  save: { emoji: "💾", label: "Save" },
  session: { emoji: "🔀", label: "Session" },
  interval: { emoji: "⏱", label: "Auto" },
  manual: { emoji: "📌", label: "Checkpoint" },
  restore: { emoji: "↩️", label: "Pre-restore" },
};

export function noteVersionSourceEmoji(source: NoteVersionSource) {
  return NOTE_VERSION_SOURCE_EMOJI[source];
}

/** Hover tooltip for snapshot rail / mobile chips (Design V4). */
export function noteVersionSourceTooltip(
  source: NoteVersionSource,
  autoIntervalMin = DEFAULT_NOTES_VERSION_INTERVAL_MINUTES,
): string {
  switch (source) {
    case "save":
      return "Manual save snapshot";
    case "session":
      return "Saved when switching notes";
    case "interval":
      return `Auto snapshot · every ${autoIntervalMin} min`;
    case "manual":
      return "Named checkpoint";
    case "restore":
      return "Backup before restore";
    default:
      return noteVersionSourceEmoji(source).label;
  }
}

export function formatNoteVersionTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Normalize list RPC rows (pre/post body_md migration). */
export function normalizeNoteVersionListItem(
  row: Partial<NoteVersionListItem> & Pick<NoteVersionListItem, "id" | "note_id" | "title" | "created_at">,
): NoteVersionListItem {
  const bodyMd = row.body_md ?? row.body_preview ?? "";
  const bodyTruncated = row.body_truncated ?? (row.body_md == null);
  return {
    id: row.id,
    note_id: row.note_id,
    title: row.title,
    body_preview: row.body_preview ?? bodyMd.slice(0, 280),
    body_md: bodyMd,
    body_truncated: bodyTruncated,
    body_length: row.body_length ?? bodyMd.length,
    content_hash: row.content_hash ?? "",
    source: row.source ?? "session",
    label: row.label ?? null,
    created_at: row.created_at,
  };
}
