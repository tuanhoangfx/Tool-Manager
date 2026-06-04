/**
 * Hub route card/list sync time — `notes.synced_at` after manual extension Sync only.
 * RPC must pass `p_touch_synced_at` (see APPLY_NOTE_SYNC_TOUCH_FLAG.sql). Vault `updated_at` is separate.
 */
export function resolveRouteSyncedDisplayIso(opts: {
  noteSyncedAt?: string | null;
}): string | null {
  return opts.noteSyncedAt?.trim() || null;
}
