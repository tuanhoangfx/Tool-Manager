import type { NoteRow, NoteListItem, NoteSyncStatus } from "./types";

/** TM-xxxxxxxx — matches Supabase backfill / extension binding */
export function generateSyncId(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `TM-${hex}`;
}

export function slugifyTitle(title: string, fallback = "note"): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}

function formatRelativeEn(iso: string | null): string {
  if (!iso) return "-";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDateEn(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function syncMeta(status: NoteSyncStatus, syncedAt: string | null): Pick<NoteListItem, "syncLabel" | "syncTone"> {
  switch (status) {
    case "synced":
      return { syncLabel: formatRelativeEn(syncedAt), syncTone: "emerald" };
    case "pending":
      return { syncLabel: "Pending", syncTone: "amber" };
    case "error":
      return { syncLabel: "Sync error", syncTone: "rose" };
    default:
      return { syncLabel: "Manual", syncTone: "amber" };
  }
}

export function toListItem(row: NoteRow): NoteListItem {
  const { syncLabel, syncTone } = syncMeta(row.sync_status, row.synced_at);
  return {
    ...row,
    syncLabel,
    syncTone,
    updatedLabel: formatDateEn(row.updated_at),
  };
}

export function cookieLines(snapshot: NoteRow["cookie_snapshot"]): string[] {
  if (!snapshot) return [];
  if (Array.isArray(snapshot)) {
    return snapshot.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "line" in item) return String((item as { line: string }).line);
      return JSON.stringify(item);
    });
  }
  return [];
}

export function formatCookieSnapshotMarkdown(lines: string[]): string {
  if (!lines.length) return "";
  return `## Cookie snapshot (masked)\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\n`;
}
