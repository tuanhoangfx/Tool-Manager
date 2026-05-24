/**
 * Tool ↔ P0020-cookie-bridge postMessage contract.
 * Message types: @p0020/bridge/protocol (synced to extension shared/protocol.js).
 */

import { BRIDGE_MSG } from "@p0020/bridge/protocol";
import type { CookieBridgePrefs } from "./cookieBridge";

export { BRIDGE_MSG };

export type ExtensionCookieBinding = {
  syncId: string;
  noteId?: string;
  pass?: string;
  domain: string;
  requiresPass?: boolean;
  noteTitle?: string;
};

function postBridgeDetail(detail: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.postMessage(detail, window.location.origin);
}

export function broadcastExtensionAuth(session: {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  user?: { email?: string | null };
}) {
  const supabase_url = import.meta.env.VITE_SUPABASE_URL as string;
  const supabase_anon_key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const detail = {
    type: BRIDGE_MSG.AUTH,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    user_email: session.user?.email ?? null,
    supabase_url,
    supabase_anon_key,
  };
  postBridgeDetail(detail);
  document.dispatchEvent(new CustomEvent("p0020-bridge-auth", { detail }));
}

export function broadcastCookieSyncNow(noteId?: string) {
  postBridgeDetail({ type: BRIDGE_MSG.SYNC, noteId: noteId?.trim() || undefined });
}

export function broadcastSelectedBinding(noteId: string | null) {
  postBridgeDetail({ type: BRIDGE_MSG.SELECT, noteId: noteId?.trim() || null });
}

export function broadcastCookieBindings(bindings: ExtensionCookieBinding[]) {
  postBridgeDetail({ type: BRIDGE_MSG.BINDINGS, bindings });
}

export function broadcastCookieBridgePrefs(prefs: CookieBridgePrefs) {
  postBridgeDetail({ type: BRIDGE_MSG.PREFS, ...prefs });
}
