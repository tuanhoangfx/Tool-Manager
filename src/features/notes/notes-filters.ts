import type { TimeRange } from "../../lib/url-prefs";
import type { NoteFolder } from "./noteFolders";
import type { NoteListItem } from "./types";

export const NOTES_FILTER_DEFS = [
  { key: "folder", label: "Folder" },
  { key: "pinned", label: "Pinned" },
  { key: "sync", label: "Sync" },
  { key: "share", label: "Share" },
] as const;

export function buildNotesFolderFilterOptions(folders: NoteFolder[]) {
  return folders.map((f) => ({
    value: f.id,
    label: f.name,
    color: f.color,
  }));
}

function dayBounds(offsetDays = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

export function matchesTimeRange(updatedAt: string | undefined, range: TimeRange): boolean {
  if (range === "all") return true;
  if (!updatedAt?.trim()) return false;
  const at = new Date(updatedAt).getTime();
  if (Number.isNaN(at)) return false;

  const now = Date.now();
  if (range === "today") {
    const { start, end } = dayBounds(0);
    return at >= start && at <= end;
  }
  if (range === "yesterday") {
    const { start, end } = dayBounds(-1);
    return at >= start && at <= end;
  }
  const days: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const d = days[range];
  if (d) return at >= now - d * 86400000;
  return true;
}

export function notesFilterOptions(_notes: NoteListItem[], folders: NoteFolder[] = []) {
  void _notes;
  return {
    folder: buildNotesFolderFilterOptions(folders),
    pinned: [
      { value: "pinned", label: "Pinned", color: "#818cf8" },
      { value: "unpinned", label: "Not pinned", color: "#6b7394" },
    ],
    sync: [
      { value: "synced", label: "Synced", color: "#22c55e" },
      { value: "pending", label: "Pending", color: "#f59e0b" },
      { value: "manual", label: "Manual", color: "#6b7394" },
      { value: "error", label: "Error", color: "#ef4444" },
    ],
    share: [
      { value: "shared", label: "Share on", color: "#06b6d4" },
      { value: "private", label: "Share off", color: "#6b7394" },
    ],
  };
}

function matchesNoteSearch(note: NoteListItem, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const stripped = query.replace(/^id\s+/i, "").trim();
  const idHay = [note.id, note.id.replace(/-/g, "")].join(" ");
  const hay = [idHay, note.title, note.domain, note.slug, note.sync_id ?? ""].join(" ").toLowerCase();
  const qNoDash = stripped.replace(/-/g, "");
  if (hay.includes(query) || hay.includes(stripped)) return true;
  if (qNoDash.length >= 8 && idHay.toLowerCase().replace(/-/g, "").includes(qNoDash)) return true;
  return false;
}

function matchesNoteFilters(note: NoteListItem, q: string, filters: Record<string, string[]>): boolean {
  if (!matchesNoteSearch(note, q)) return false;
  if (filters.pinned?.length) {
    const pin = note.pinned ? "pinned" : "unpinned";
    if (!filters.pinned.includes(pin)) return false;
  }
  if (filters.sync?.length && !filters.sync.includes(note.sync_status)) return false;
  if (filters.share?.length) {
    const sh = note.share_enabled ? "shared" : "private";
    if (!filters.share.includes(sh)) return false;
  }
  return true;
}

export function filterNotes(
  notes: NoteListItem[],
  q: string,
  filters: Record<string, string[]>,
  range: TimeRange,
): NoteListItem[] {
  return notes.filter(
    (n) => matchesNoteFilters(n, q, filters) && matchesTimeRange(n.updated_at, range),
  );
}
