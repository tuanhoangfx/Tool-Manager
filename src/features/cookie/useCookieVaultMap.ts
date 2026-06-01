import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { CookieBinding } from "./cookieBridge";
import { fetchCookieVaultRows, mapVaultRows } from "./cookieVaultRepository";

export type CookieVaultRow = {
  note_id: string;
  domain: string;
  cookie_count: number;
  updated_at: string;
  source_browser: string | null;
  updated_by: string | null;
};

export function useCookieVaultMap(session: Session | null, bindings: CookieBinding[]) {
  const [vaultByKey, setVaultByKey] = useState<Record<string, CookieVaultRow>>({});
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const noteIds = useMemo(
    () => bindings.filter((b) => b.enabled && b.noteId?.trim()).map((b) => b.noteId.trim()),
    [bindings],
  );

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!session || noteIds.length === 0) {
      setVaultByKey({});
      setVaultError(null);
      return;
    }
    if (!silent) setLoading(true);
    setVaultError(null);
    const { data, error } = await fetchCookieVaultRows(noteIds);

    if (!silent) setLoading(false);
    if (error) {
      const msg = error.message ?? String(error);
      if (/note_cookie_vault|does not exist|schema cache/i.test(msg)) {
        setVaultError("Run supabase/APPLY_VAULT_V4.sql");
      } else {
        setVaultError(msg);
      }
      return;
    }
    setVaultByKey(mapVaultRows(data ?? []));
  }, [noteIds, session]);

  useEffect(() => {
    const hasVault = Object.keys(vaultByKey).length > 0;
    void refresh({ silent: hasVault });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- silent when vault already shown
  }, [refresh]);

  return { vaultByKey, vaultError, vaultLoading: loading, refreshVault: refresh };
}

export function vaultKey(noteId: string, domain: string) {
  return `${noteId}:${domain}`;
}
