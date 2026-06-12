import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type Listener = () => void;

let channel: RealtimeChannel | null = null;
let boundUserId: string | null = null;
let boundUserEmail: string | null = null;
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
  }, 400);
}

function ensureChannel(userId: string, userEmail?: string | null) {
  const emailKey = userEmail?.trim().toLowerCase() || null;
  if (channel && boundUserId === userId && boundUserEmail === emailKey) return;

  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
    boundUserId = null;
    boundUserEmail = null;
  }

  boundUserId = userId;
  boundUserEmail = emailKey;
  channel = supabase
    .channel(`notes-cookie:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleNotify(),
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleNotify(),
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${userId}`,
      },
      () => scheduleNotify(),
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
    );

  if (emailKey) {
    channel = channel!.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "note_cookie_members",
        filter: `grantee_email=eq.${emailKey}`,
      },
      () => {
        scheduleNotify();
      },
    );
  }

  channel = channel!
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
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cookie_route_user_activity",
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
    boundUserEmail = null;
  }
}

/** One Supabase channel per user — safe for useNotes + useNote + Cookie screen together */
export function addNotesCookieListener(
  userId: string,
  listener: Listener,
  userEmail?: string | null,
): () => void {
  listeners.add(listener);
  ensureChannel(userId, userEmail);
  return () => {
    listeners.delete(listener);
    teardownIfIdle();
  };
}
