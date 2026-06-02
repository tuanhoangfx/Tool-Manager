import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Listener = () => void;

let channel: RealtimeChannel | null = null;
let boundUserId: string | null = null;
const listeners = new Set<Listener>();
let notifyTimer = 0;

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error("[P0020] notes cookie realtime listener", err);
    }
  });
}

/** Coalesce burst updates (extension sync / route writes) to avoid UI flicker. */
function scheduleNotify() {
  window.clearTimeout(notifyTimer);
  notifyTimer = window.setTimeout(() => {
    notifyTimer = 0;
    notifyListeners();
  }, 800);
}

function ensureChannel(userId: string) {
  if (channel && boundUserId === userId) return;

  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
    boundUserId = null;
  }

  boundUserId = userId;
  channel = supabase
    .channel(`notes-cookie:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const prev = payload.old as Record<string, unknown> | undefined;
        const row = payload.new as Record<string, unknown>;
        const cookieChanged =
          prev != null &&
          JSON.stringify(prev.cookie_snapshot ?? null) !== JSON.stringify(row.cookie_snapshot ?? null);
        const syncChanged =
          prev != null &&
          (prev.sync_status !== row.sync_status || prev.synced_at !== row.synced_at);
        if (cookieChanged || syncChanged) {
          scheduleNotify();
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cookie_bridge_routes",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        scheduleNotify();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "note_cookie_members",
        filter: `owner_user_id=eq.${userId}`,
      },
      () => {
        scheduleNotify();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "note_cookie_members",
        filter: `grantee_user_id=eq.${userId}`,
      },
      () => {
        scheduleNotify();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "note_cookie_vault",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        scheduleNotify();
      },
    )
    .subscribe();
}

function teardownIfIdle() {
  if (listeners.size > 0) return;
  window.clearTimeout(notifyTimer);
  notifyTimer = 0;
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
    boundUserId = null;
  }
}

/** One Supabase channel per user — safe for useNotes + useNote + Cookie screen together */
export function addNotesCookieListener(userId: string, listener: Listener): () => void {
  listeners.add(listener);
  ensureChannel(userId);
  return () => {
    listeners.delete(listener);
    teardownIfIdle();
  };
}
