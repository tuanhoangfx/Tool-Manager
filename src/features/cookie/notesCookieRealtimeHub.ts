import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Listener = () => void;

let channel: RealtimeChannel | null = null;
let boundUserId: string | null = null;
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
          listeners.forEach((fn) => {
            try {
              fn();
            } catch (err) {
              console.error("[P0020] notes cookie realtime listener", err);
            }
          });
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
        listeners.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error("[P0020] route realtime listener", err);
          }
        });
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
        listeners.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error("[P0020] member owner realtime listener", err);
          }
        });
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
        listeners.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error("[P0020] member grantee realtime listener", err);
          }
        });
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
        listeners.forEach((fn) => {
          try {
            fn();
          } catch (err) {
            console.error("[P0020] vault realtime listener", err);
          }
        });
      },
    )
    .subscribe();
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
