import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Listener = () => void;

let channel: RealtimeChannel | null = null;
let boundUserId: string | null = null;
let notifyScheduled = false;
const listeners = new Set<Listener>();

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
        const row = payload.new as Record<string, unknown>;
        if ("cookie_snapshot" in row || "sync_status" in row || "synced_at" in row) {
          scheduleNotify();
        }
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "note_cookie_vault",
        filter: `user_id=eq.${userId}`,
      },
      () => {
        scheduleNotify();
      },
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
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

function scheduleNotify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  window.setTimeout(() => {
    notifyScheduled = false;
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("[P0020] notes cookie realtime listener", err);
      }
    });
  }, 400);
}

function teardownIfIdle() {
  if (listeners.size > 0) return;
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
