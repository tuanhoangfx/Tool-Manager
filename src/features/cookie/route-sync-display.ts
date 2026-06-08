import type { RouteStatChipTone } from "./cookieRouteStatChips";

/**
 * Hub route card/list sync time — `notes.synced_at` after manual extension Sync only.
 * RPC must pass `p_touch_synced_at` (see APPLY_NOTE_SYNC_TOUCH_FLAG.sql). Vault `updated_at` is separate.
 */
export function resolveRouteSyncedDisplayIso(opts: {
  noteSyncedAt?: string | null;
}): string | null {
  return opts.noteSyncedAt?.trim() || null;
}

export function resolveRouteFilterStatus(opts: {
  syncStatus?: string | null;
  noteSyncedAt?: string | null;
  vaultCookieCount?: number | null;
}): string {
  return resolveRouteSyncDisplay(opts).filterStatus;
}

export type RouteSyncDisplay = {
  label: string;
  tone: RouteStatChipTone;
  /** Raw `notes.sync_status` for filters and aggregates. */
  filterStatus: string;
  title: string;
};

/**
 * Route list/card sync chip — separates vault sync time from note snapshot status.
 * `notes.sync_status` reflects `cookie_snapshot` length; vault cookies can exist while status stays pending.
 */
export function resolveRouteSyncDisplay(opts: {
  syncStatus?: string | null;
  noteSyncedAt?: string | null;
  vaultCookieCount?: number | null;
}): RouteSyncDisplay {
  const raw = (opts.syncStatus ?? "pending").toLowerCase();

  if (raw === "synced") {
    return {
      label: "Synced",
      tone: "ok",
      filterStatus: "synced",
      title: "Cookie snapshot synced to cloud",
    };
  }
  if (raw === "error") {
    return {
      label: "Error",
      tone: "warn",
      filterStatus: "error",
      title: "Last extension sync failed",
    };
  }
  if (raw === "manual") {
    return {
      label: "Manual",
      tone: "neutral",
      filterStatus: "manual",
      title: "Manual cookie route — no auto sync",
    };
  }

  const hasVault = (opts.vaultCookieCount ?? 0) > 0;
  const hasSyncedAt = Boolean(opts.noteSyncedAt?.trim());

  if (hasVault || hasSyncedAt) {
    const title = hasVault && hasSyncedAt
      ? "Cookies are in cloud vault; note snapshot flag is still pending"
      : hasVault
        ? "Cookies stored in encrypted cloud vault"
        : "Extension sync recorded; snapshot not yet marked synced";
    return {
      label: "Synced",
      tone: "ok",
      filterStatus: "synced",
      title,
    };
  }

  return {
    label: "Awaiting sync",
    tone: "warn",
    filterStatus: "pending",
    title: "No vault cookies yet — run Sync on the extension",
  };
}
