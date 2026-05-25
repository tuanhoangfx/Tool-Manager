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

function formatRelativeVi(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function formatDateVi(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function syncMeta(status: NoteSyncStatus, syncedAt: string | null): Pick<NoteListItem, "syncLabel" | "syncTone"> {
  switch (status) {
    case "synced":
      return { syncLabel: formatRelativeVi(syncedAt), syncTone: "emerald" };
    case "pending":
      return { syncLabel: "Chờ extension", syncTone: "amber" };
    case "error":
      return { syncLabel: "Lỗi sync", syncTone: "rose" };
    default:
      return { syncLabel: "Thủ công", syncTone: "amber" };
  }
}

export function toListItem(row: NoteRow): NoteListItem {
  const { syncLabel, syncTone } = syncMeta(row.sync_status, row.synced_at);
  return {
    ...row,
    syncLabel,
    syncTone,
    updatedLabel: formatDateVi(row.updated_at),
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
