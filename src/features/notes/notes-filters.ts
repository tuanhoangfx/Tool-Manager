import {
  matchesWorkspacePeriod,
  type WorkspacePeriodKey,
  type WorkspacePeriodPrefs,
} from "../../lib/hub-workspace-period";
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

/** @deprecated Use matchesWorkspacePeriod — kept for cookie/2FA imports during migration. */
export function matchesTimeRange(
  updatedAt: string | undefined,
  period: WorkspacePeriodPrefs | WorkspacePeriodKey,
): boolean {
  return matchesWorkspacePeriod(updatedAt, period);
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
      { value: "edit", label: "Edit link", color: "#a78bfa" },
      { value: "view", label: "View link", color: "#06b6d4" },
      { value: "private", label: "Only me", color: "#6b7394" },
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
    const sh = !note.share_enabled ? "private" : note.share_can_edit ? "edit" : "view";
    if (!filters.share.includes(sh)) return false;
  }
  return true;
}

export function filterNotes(
  notes: NoteListItem[],
  q: string,
  filters: Record<string, string[]>,
  period: WorkspacePeriodPrefs | WorkspacePeriodKey,
  cookieRouteNoteIds?: ReadonlySet<string>,
): NoteListItem[] {
  return notes.filter((n) => {
    if (!matchesNoteFilters(n, q, filters)) return false;
    const activityAt =
      cookieRouteNoteIds?.has(n.id) && n.synced_at?.trim() ? n.synced_at : n.updated_at;
    return matchesWorkspacePeriod(activityAt, period);
  });
}
