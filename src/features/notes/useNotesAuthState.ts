import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cacheDataBoxSession, readDataBoxSession, sessionFromDataBoxSnapshot } from "../../lib/data-box-session";
import { ensureDataBoxAuth } from "../../lib/ensure-data-box-auth";
import { ensureHubIdentityStubFromDataSession, readHubIdentity } from "../../lib/hub-identity-session";
import { promiseWithTimeout } from "../../lib/promise-timeout";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { getOfflineMode, offlineSession } from "../../lib/offlineMode";

/** Only first app boot — must not abort an active login session. */
const AUTH_BOOT_TIMEOUT_MS = 12_000;

async function resolveDataBoxSessionCore(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const restored = await ensureDataBoxAuth();
  if (restored) return restored;
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export type NotesAuthState = {
  session: Session | null;
  hubEmail: string | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  offline: boolean;
  refreshSession: () => Promise<void>;
  /** Call after sign-in so UI updates immediately without a destructive refresh. */
  adoptSession: (session: Session) => void;
};

function initialAuthState(): { session: Session | null; loading: boolean; offline: boolean } {
  const offline = getOfflineMode();
  if (offline) {
    return { session: offlineSession(), loading: false, offline: true };
  }
  const snap = readDataBoxSession();
  const cached = sessionFromDataBoxSnapshot(snap);
  return {
    session: cached,
    loading: !cached && isSupabaseConfigured,
    offline: false,
  };
}

export function useNotesAuthState(): NotesAuthState {
  const initial = initialAuthState();
  const [session, setSession] = useState<Session | null>(initial.session);
  const [hubEmail, setHubEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial.loading);
  const [offline, setOffline] = useState(initial.offline);
  const adoptSession = useCallback((next: Session) => {
    cacheDataBoxSession(next);
    ensureHubIdentityStubFromDataSession(next);
    setSession(next);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async (opts?: { boot?: boolean }) => {
    setHubEmail(readHubIdentity()?.user_email ?? null);
    const showBlockingLoader = opts?.boot && !sessionFromDataBoxSnapshot(readDataBoxSession());
    if (showBlockingLoader) setLoading(true);
    try {
      const resolved = opts?.boot
        ? await promiseWithTimeout(resolveDataBoxSessionCore(), AUTH_BOOT_TIMEOUT_MS, null)
        : await resolveDataBoxSessionCore();

      if (resolved) {
        setSession((prev) =>
          prev?.user?.id === resolved.user?.id && prev.access_token === resolved.access_token
            ? prev
            : resolved,
        );
        return;
      }

      if (isSupabaseConfigured) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession((prev) =>
            prev?.user?.id === data.session!.user?.id && prev.access_token === data.session!.access_token
              ? prev
              : data.session,
          );
          return;
        }
      }

      if (opts?.boot && !sessionFromDataBoxSnapshot(readDataBoxSession())) {
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let dataUnsub: (() => void) | null = null;

    const bindDataBoxListener = () => {
      if (!isSupabaseConfigured) return;
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, s) => {
        if (cancelled) return;
        setSession((prev) => {
          if (!s) return null;
          if (prev?.user?.id === s.user?.id && prev.access_token === s.access_token) return prev;
          return s;
        });
        if (s) {
          cacheDataBoxSession(s);
          ensureHubIdentityStubFromDataSession(s);
        }
        setLoading(false);
      });
      dataUnsub = () => subscription.unsubscribe();
    };

    const sync = async (opts?: { boot?: boolean }) => {
      if (cancelled) return;
      const nextOffline = getOfflineMode();
      setOffline(nextOffline);
      if (nextOffline) {
        setSession(offlineSession());
        setHubEmail(null);
        setLoading(false);
        if (dataUnsub) dataUnsub();
        dataUnsub = null;
        return;
      }
      if (opts?.boot && !sessionFromDataBoxSnapshot(readDataBoxSession())) {
        setLoading(true);
      }
      await refreshSession({ boot: opts?.boot });
      if (cancelled) return;
      bindDataBoxListener();
    };

    void sync({ boot: true });

    const onHubIdentity = () => {
      setHubEmail(readHubIdentity()?.user_email ?? null);
    };

    let storageTimer = 0;
    const onStorage = () => {
      window.clearTimeout(storageTimer);
      storageTimer = window.setTimeout(() => {
        if (!cancelled) void refreshSession();
      }, 400);
    };

    window.addEventListener("p0020:hub-identity", onHubIdentity);
    const onOfflineMode = () => void sync();
    window.addEventListener("p0020:offline-mode", onOfflineMode);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.clearTimeout(storageTimer);
      window.removeEventListener("p0020:hub-identity", onHubIdentity);
      window.removeEventListener("p0020:offline-mode", onOfflineMode);
      window.removeEventListener("storage", onStorage);
      if (dataUnsub) dataUnsub();
    };
  }, [refreshSession]);

  return { session, hubEmail, loading, isSupabaseConfigured, offline, refreshSession, adoptSession };
}
