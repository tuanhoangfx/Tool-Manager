import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { CookieBinding } from "./cookieBridge";

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

  const noteIds = bindings
    .filter((b) => b.enabled && b.noteId?.trim())
    .map((b) => b.noteId.trim());

  const refresh = useCallback(async () => {
    if (!session || noteIds.length === 0) {
      setVaultByKey({});
      setVaultError(null);
      return;
    }
    setLoading(true);
    setVaultError(null);
    const { data, error } = await supabase
      .from("note_cookie_vault")
      .select("note_id, domain, cookie_count, updated_at, source_browser, updated_by")
      .in("note_id", [...new Set(noteIds)]);

    setLoading(false);
    if (error) {
      const msg = error.message ?? String(error);
      if (/note_cookie_vault|does not exist|schema cache/i.test(msg)) {
        setVaultError("Run supabase/APPLY_VAULT_V4.sql");
      } else {
        setVaultError(msg);
      }
      return;
    }
    const map: Record<string, CookieVaultRow> = {};
    for (const row of data ?? []) {
      map[`${row.note_id}:${row.domain}`] = row as CookieVaultRow;
    }
    setVaultByKey(map);
  }, [session, noteIds.join("|")]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { vaultByKey, vaultError, vaultLoading: loading, refreshVault: refresh };
}

export function vaultKey(noteId: string, domain: string) {
  return `${noteId}:${domain}`;
}
