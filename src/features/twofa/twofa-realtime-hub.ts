import type { RealtimeChannel } from "@supabase/supabase-js";
import { getTwofaSupabase } from "../../lib/twofa-supabase";

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
      console.error("[P0020] 2FA realtime listener", err);
    }
  });
}

/** Coalesce burst writes (bulk import / multi-tab) to avoid sync thrash. */
function scheduleNotify() {
  window.clearTimeout(notifyTimer);
  notifyTimer = window.setTimeout(() => {
    notifyTimer = 0;
    notifyListeners();
  }, 400);
}

function ensureChannel(userId: string) {
  const client = getTwofaSupabase();
  if (!client) return;
  if (channel && boundUserId === userId) return;

  if (channel) {
    void client.removeChannel(channel);
    channel = null;
    boundUserId = null;
  }

  boundUserId = userId;
  channel = client
    .channel(`twofa-vault:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "twofa_accounts",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleNotify(),
    )
    .subscribe();
}

function teardownIfIdle() {
  if (listeners.size > 0) return;
  window.clearTimeout(notifyTimer);
  notifyTimer = 0;
  const client = getTwofaSupabase();
  if (channel && client) {
    void client.removeChannel(channel);
    channel = null;
    boundUserId = null;
  }
}

/** One Realtime channel per 2FA vault user — safe across tabs/components. */
export function addTwofaRealtimeListener(userId: string, listener: Listener): () => void {
  listeners.add(listener);
  ensureChannel(userId);
  return () => {
    listeners.delete(listener);
    teardownIfIdle();
  };
}
