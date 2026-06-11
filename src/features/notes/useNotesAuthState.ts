import { useCallback, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  resolveWithBootTimeout,
  sessionsEqual,
  useWorkspaceDataAuthBoot,
  WORKSPACE_AUTH_BOOT_TIMEOUT_MS,
} from "@tool-workspace/hub-identity";
import { API_UNAUTHORIZED_EVENT } from "../../lib/api-auth-token";
import {
  cacheDataBoxSession,
  clearDataBoxSession,
  readDataBoxSession,
  sessionFromDataBoxSnapshot,
} from "../../lib/data-box-session";
import { ensureDataBoxAuth } from "../../lib/ensure-data-box-auth";
import {
  cacheHubIdentity,
  ensureHubIdentityStubFromDataSession,
  readHubIdentity,
} from "../../lib/hub-identity-session";
import {
  startHubTokenRefreshScheduler,
  stopHubTokenRefreshScheduler,
} from "../../lib/hub-token-refresh-scheduler";
import { isToolHubOrigin } from "../../lib/hub-identity-urls";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { getOfflineMode, offlineSession } from "../../lib/offlineMode";

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
  hubUserId: string | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  offline: boolean;
  refreshSession: () => Promise<void>;
  adoptSession: (session: Session) => void;
};

function initialAuthState(): { session: Session | null; loading: boolean; offline: boolean } {
  const offline = getOfflineMode();
  if (offline) {
    return { session: offlineSession(), loading: false, offline: true };
  }
  return {
    session: sessionFromDataBoxSnapshot(readDataBoxSession()),
    loading: isSupabaseConfigured,
    offline: false,
  };
}

export function useNotesAuthState(): NotesAuthState {
  const initial = initialAuthState();
  const [session, setSession] = useState<Session | null>(initial.session);
  const [hubEmail, setHubEmail] = useState<string | null>(() => readHubIdentity()?.user_email ?? null);
  const [hubUserId, setHubUserId] = useState<string | null>(() => readHubIdentity()?.user_id ?? null);
  const [hubAccessToken, setHubAccessToken] = useState<string | null>(
    () => readHubIdentity()?.access_token ?? null,
  );
  const [loading, setLoading] = useState(initial.loading);
  const [offline, setOffline] = useState(initial.offline);

  const syncHubIdentity = useCallback(() => {
    const snap = readHubIdentity();
    setHubEmail(snap?.user_email ?? null);
    setHubUserId(snap?.user_id ?? null);
    setHubAccessToken(snap?.access_token ?? null);
  }, []);

  const adoptSession = useCallback((next: Session) => {
    cacheDataBoxSession(next);
    ensureHubIdentityStubFromDataSession(next);
    setSession(next);
    setLoading(false);
  }, []);

  const refreshSession = useCallback(
    async (opts?: { boot?: boolean }) => {
      syncHubIdentity();
      const nextOffline = getOfflineMode();
      setOffline(nextOffline);
      if (nextOffline) {
        setSession(offlineSession());
        setHubEmail(null);
        setHubUserId(null);
        setLoading(false);
        return;
      }

      const showBlockingLoader = opts?.boot && !sessionFromDataBoxSnapshot(readDataBoxSession());
      if (showBlockingLoader) setLoading(true);
      try {
        const resolved = await resolveWithBootTimeout(
          () => resolveDataBoxSessionCore(),
          opts?.boot,
          null,
          WORKSPACE_AUTH_BOOT_TIMEOUT_MS,
        );

        if (resolved) {
          setSession((prev) => (sessionsEqual(prev, resolved) ? prev : resolved));
          return;
        }

        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setSession((prev) => (sessionsEqual(prev, data.session) ? prev : data.session));
            return;
          }
        }

        if (opts?.boot) {
          if (readDataBoxSession()) clearDataBoxSession();
          setSession(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [syncHubIdentity],
  );

  const handleOfflineChange = useCallback(() => {
    void refreshSession();
  }, [refreshSession]);

  useWorkspaceDataAuthBoot({
    isConfigured: () => isSupabaseConfigured,
    readCachedSession: () => sessionFromDataBoxSnapshot(readDataBoxSession()),
    refreshSession,
    getClient: () => (isSupabaseConfigured ? supabase : null),
    persistSession: cacheDataBoxSession,
    onSignedOut: () => {
      setSession(null);
      setLoading(false);
    },
    onSignedIn: (next) => {
      setSession((prev) => (sessionsEqual(prev, next) ? prev : next));
      ensureHubIdentityStubFromDataSession(next);
      setLoading(false);
    },
    onBootStart: () => setLoading(true),
    isToolHubOrigin,
    onHubRelayReceived: (snapshot) => {
      cacheHubIdentity(snapshot);
      void ensureDataBoxAuth().then((next) => {
        if (next) adoptSession(next);
      });
    },
    offlineEventName: "p0020:offline-mode",
    onOfflineChange: handleOfflineChange,
    apiUnauthorizedEvent: API_UNAUTHORIZED_EVENT,
    tokenScheduler: {
      start: startHubTokenRefreshScheduler,
      stop: stopHubTokenRefreshScheduler,
    },
    hubAccessToken,
    identityRefreshDebounceMs: 400,
    syncHubIdentityLabels: syncHubIdentity,
  });

  return { session, hubEmail, hubUserId, loading, isSupabaseConfigured, offline, refreshSession, adoptSession };
}
