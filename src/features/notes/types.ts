export type NoteSyncStatus = "manual" | "synced" | "pending" | "error";

export type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  domain: string;
  body_md: string;
  cookie_snapshot: string[] | Record<string, unknown>[] | null;
  pinned: boolean;
  share_enabled: boolean;
  share_can_edit: boolean;
  share_token: string | null;
  share_password_hash: string | null;
  share_expires_at: string | null;
  share_view_count: number;
  sync_status: NoteSyncStatus;
  synced_at: string | null;
  sync_id: string | null;
  sync_pass_hash: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteListItem = NoteRow & {
  syncLabel: string;
  syncTone: "emerald" | "amber" | "rose";
  updatedLabel: string;
};
