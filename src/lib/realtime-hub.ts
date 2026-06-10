import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

type Listener = () => void;

export type RealtimeHubBinding = {
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  table: string;
  filter?: string;
};

export type CreateRealtimeHubOpts = {
  scope: string;
  debounceMs?: number;
  bindingsForUser: (userId: string) => RealtimeHubBinding[];
};

/**
 * Shared debounced Supabase postgres_changes hub (Cookie Auto / Notes pattern).
 * One channel per user per scope; safe across tabs/components.
 */
export function createRealtimeHub(
  getClient: () => SupabaseClient | null,
  opts: CreateRealtimeHubOpts,
) {
  const { scope, debounceMs = 400, bindingsForUser } = opts;
  let channel: RealtimeChannel | null = null;
  let boundUserId: string | null = null;
  const listeners = new Set<Listener>();
  let notifyTimer = 0;

  function notifyListeners() {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error(`[realtime-hub:${scope}] listener`, err);
      }
    });
  }

  function scheduleNotify() {
    window.clearTimeout(notifyTimer);
    notifyTimer = window.setTimeout(() => {
      notifyTimer = 0;
      notifyListeners();
    }, debounceMs);
  }

  function ensureChannel(userId: string) {
    const client = getClient();
    if (!client) return;
    if (channel && boundUserId === userId) return;

    if (channel) {
      void client.removeChannel(channel);
      channel = null;
      boundUserId = null;
    }

    boundUserId = userId;
    let next = client.channel(`${scope}:${userId}`);
    for (const binding of bindingsForUser(userId)) {
      next = next.on(
        "postgres_changes",
        {
          event: binding.event,
          schema: binding.schema ?? "public",
          table: binding.table,
          ...(binding.filter ? { filter: binding.filter } : {}),
        },
        () => scheduleNotify(),
      );
    }
    channel = next.subscribe();
  }

  function teardownIfIdle() {
    if (listeners.size > 0) return;
    window.clearTimeout(notifyTimer);
    notifyTimer = 0;
    const client = getClient();
    if (channel && client) {
      void client.removeChannel(channel);
      channel = null;
      boundUserId = null;
    }
  }

  return function addRealtimeListener(userId: string, listener: Listener): () => void {
    listeners.add(listener);
    ensureChannel(userId);
    return () => {
      listeners.delete(listener);
      teardownIfIdle();
    };
  };
}
