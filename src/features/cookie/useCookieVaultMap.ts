import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CookieBinding } from "./cookieBridge";
import { cookieVaultCache } from "./cookie-vault-cache";
import type { HubSyncHealth } from "@tool-workspace/hub-ui";
import { fetchCookieVaultRows, mapVaultRows, vaultRouteKey } from "./cookieVaultRepository";

export type CookieVaultRow = {
  note_id: string;
  domain: string;
  cookie_count: number;
  updated_at: string;
  source_browser: string | null;
  updated_by: string | null;
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientVaultError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return (
    msg === "Failed to fetch" ||
    msg.startsWith("TypeError: Failed to fetch") ||
    /networkerror|load failed/i.test(msg)
  );
}

export function useCookieVaultMap(
  session: Session | null,
  bindings: CookieBinding[],
  opts?: { enabled?: boolean },
) {
  const enabled = opts?.enabled ?? true;
  const [vaultByKey, setVaultByKey] = useState<Record<string, CookieVaultRow>>(() => {
    if (!enabled) return {};
    return cookieVaultCache.readStale() ?? {};
  });
  const [vaultHealth, setVaultHealth] = useState<HubSyncHealth>(() => {
    const cached = cookieVaultCache.readStale();
    return cached && Object.keys(cached).length > 0 ? "stale" : "offline";
  });
  const [loading, setLoading] = useState(false);
  const vaultByKeyRef = useRef(vaultByKey);
  vaultByKeyRef.current = vaultByKey;

  const noteIdsKey = useMemo(
    () =>
      [...new Set(bindings.filter((b) => b.enabled && b.noteId?.trim()).map((b) => b.noteId.trim()))]
        .sort()
        .join("|"),
    [bindings],
  );
  const noteIds = useMemo(() => (noteIdsKey ? noteIdsKey.split("|") : []), [noteIdsKey]);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const cached = cookieVaultCache.readStale() ?? vaultByKeyRef.current;
    const hasCachedVault = Object.keys(cached).length > 0;
    const silent = opts?.silent ?? hasCachedVault;
    if (!enabled || !session || noteIds.length === 0) {
      setVaultByKey({});
      setVaultHealth("offline");
      cookieVaultCache.clear();
      return;
    }
    if (!silent) setLoading(true);

    let lastError: unknown = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { data, error } = await fetchCookieVaultRows(noteIds);
      if (!error) {
        const next = mapVaultRows(data ?? []);
        if (!silent) setLoading(false);
        setVaultByKey(next);
        cookieVaultCache.write(next);
        setVaultHealth("synced");
        return;
      }
      lastError = error;
      if (!isTransientVaultError(error) || attempt >= maxAttempts) break;
      await wait(400 * 2 ** (attempt - 1));
    }

    if (!silent) setLoading(false);
    if (hasCachedVault) {
      console.warn("[P0020] cookie vault refresh failed (keeping cache)", lastError);
      setVaultHealth("stale");
      return;
    }
    setVaultHealth("offline");
  }, [enabled, noteIds, session]);

  useEffect(() => {
    if (!enabled) return;
    const stale = cookieVaultCache.readStale();
    if (stale && Object.keys(stale).length > 0) {
      setVaultByKey(stale);
      setVaultHealth("stale");
    }
    void refresh({ silent: Boolean(stale && Object.keys(stale).length > 0) });
  }, [enabled, noteIdsKey, refresh]);

  return { vaultByKey, vaultHealth, vaultLoading: loading, refreshVault: refresh };
}

/** @deprecated Use {@link vaultRouteKey} from cookieVaultRepository */
export function vaultKey(noteId: string, domain: string) {
  return vaultRouteKey(noteId, domain);
}

export { lookupVaultRow, vaultRouteKey } from "./cookieVaultRepository";
