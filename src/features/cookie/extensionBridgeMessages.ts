/** Browser-extension postMessage contract for E0001-cookie-bridge. */

export type ExtensionCookieBinding = {
  syncId: string;
  noteId?: string;
  pass?: string;
  domain: string;
  requiresPass?: boolean;
  noteTitle?: string;
  sourceBrowserId?: string | null;
  sourceLabel?: string | null;
  ownerUserId?: string | null;
  ownerUserEmail?: string | null;
  accessRole?: "owner" | "member";
  canApply?: boolean;
  canPublish?: boolean;
  canManage?: boolean;
};

export function broadcastExtensionAuth(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: { id?: string | null; email?: string | null };
}) {
  const supabase_url = import.meta.env.VITE_SUPABASE_URL as string;
  const supabase_anon_key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const detail = {
    type: "E0001_COOKIE_BRIDGE_AUTH",
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_id: session.user?.id ?? null,
    user_email: session.user?.email ?? null,
    supabase_url,
    supabase_anon_key,
  };
  window.postMessage(detail, window.location.origin);
  document.dispatchEvent(new CustomEvent("e0001-bridge-auth", { detail }));
}

export function broadcastCookieSyncNow(noteId?: string) {
  const detail = { type: "E0001_COOKIE_BRIDGE_SYNC", noteId: noteId?.trim() || undefined };
  window.postMessage(detail, window.location.origin);
}

export function broadcastSelectedBinding(noteId: string | null) {
  const detail = { type: "E0001_COOKIE_BRIDGE_SELECT", noteId: noteId?.trim() || null };
  window.postMessage(detail, window.location.origin);
}

export function broadcastCookieBindings(bindings: ExtensionCookieBinding[]) {
  const detail = { type: "E0001_COOKIE_BRIDGE_BINDINGS", bindings };
  window.postMessage(detail, window.location.origin);
}

export function broadcastCookieBridgePrefs(prefs: {
  syncIntervalMinutes: number;
  realtimeSync: boolean;
  vaultSync?: boolean;
  realtimeVaultApply?: boolean;
  bridgeRole?: "writer" | "reader";
}) {
  const detail = { type: "E0001_COOKIE_BRIDGE_PREFS", ...prefs };
  window.postMessage(detail, window.location.origin);
}
