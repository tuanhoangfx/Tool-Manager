import type { NoteRow, NoteListItem, NoteSyncStatus } from "./types";

/** TM-xxxxxxxx — matches Supabase backfill / extension binding */
export function generateSyncId(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `TM-${hex}`;
}

/** Skip redundant editor/network updates when detail payload is unchanged. */
export function noteEditorContentEqual(a: NoteRow, b: NoteRow): boolean {
  return (
    a.id === b.id &&
    a.updated_at === b.updated_at &&
    a.title === b.title &&
    a.body_md === b.body_md &&
    a.slug === b.slug &&
    a.domain === b.domain &&
    a.pinned === b.pinned &&
    a.share_enabled === b.share_enabled &&
    a.sync_status === b.sync_status
  );
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

/** Matches `fetchNotesList` ordering — pinned first, then `updated_at` desc. */
export function sortNoteRows(rows: NoteRow[]): NoteRow[] {
  return [...rows].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

/** Patch list cache from a detail save without storing heavy columns from the save response. */
export function mergeNoteRowForList(existing: NoteRow, saved: NoteRow): NoteRow {
  return {
    ...existing,
    title: saved.title,
    slug: saved.slug,
    domain: saved.domain,
    pinned: saved.pinned,
    share_enabled: saved.share_enabled,
    share_token: saved.share_token,
    share_password_hash: saved.share_password_hash,
    share_expires_at: saved.share_expires_at,
    share_view_count: saved.share_view_count,
    updated_at: saved.updated_at,
    sync_id: saved.sync_id ?? existing.sync_id,
    sync_pass_hash: saved.sync_pass_hash ?? existing.sync_pass_hash,
    body_md: existing.body_md,
    cookie_snapshot: existing.cookie_snapshot,
  };
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
