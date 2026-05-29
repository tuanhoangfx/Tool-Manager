import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

const KEY = "p0020.offlineMode.v1";

export function getOfflineMode(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setOfflineMode(next: boolean) {
  try {
    window.localStorage.setItem(KEY, next ? "1" : "0");
    window.dispatchEvent(new Event("p0020:offline-mode"));
  } catch {
    // ignore
  }
}

export function useOfflineMode() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(getOfflineMode());
    const on = () => setOffline(getOfflineMode());
    window.addEventListener("storage", on);
    window.addEventListener("p0020:offline-mode", on);
    return () => {
      window.removeEventListener("storage", on);
      window.removeEventListener("p0020:offline-mode", on);
    };
  }, []);

  return {
    offline,
    setOfflineMode: (next: boolean) => setOfflineMode(next),
    toggle: () => setOfflineMode(!offline),
  };
}

export function offlineSession(): Session {
  const now = new Date().toISOString();
  const id = "offline-user";
  const email = "offline@local";

  // Only a minimal shape is required by the UI (mainly `session.user.id/email`).
  return {
    access_token: "offline",
    token_type: "bearer",
    expires_in: 60 * 60 * 24 * 365,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
    refresh_token: "offline",
    user: {
      id,
      aud: "authenticated",
      role: "authenticated",
      email,
      app_metadata: {},
      user_metadata: {},
      created_at: now,
      updated_at: now,
    },
  } as unknown as Session;
}

