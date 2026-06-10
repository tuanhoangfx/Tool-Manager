import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";

type Listener = () => void;

let channel: RealtimeChannel | null = null;
let boundUserId: string | null = null;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error("[P0020] todo notifications realtime listener", err);
    }
  });
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
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      () => notifyListeners(),
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

/** One Realtime channel per user — safe across TodoScreen + TodoAppCore. */
export function addNotificationsRealtimeListener(userId: string, listener: Listener): () => void {
  listeners.add(listener);
  ensureChannel(userId);
  return () => {
    listeners.delete(listener);
    teardownIfIdle();
  };
}
