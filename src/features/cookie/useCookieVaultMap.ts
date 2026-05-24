import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { CookieBinding } from "./cookieBridge";
import { bindingVaultQueryKey } from "./bindingVaultKeys";

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

  const vaultQueryKey = bindingVaultQueryKey(bindings);
  const noteIds = vaultQueryKey
    ? [...new Set(vaultQueryKey.split("|").map((p) => p.split(":")[0]))]
    : [];

  const refresh = useCallback(async () => {
    if (!session || !vaultQueryKey) {
      setVaultByKey({});
      setVaultError(null);
      return;
    }
    setLoading(true);
    setVaultError(null);
    let data: CookieVaultRow[] | null = null;
    let error: { message?: string } | null = null;
    const res = await supabase
      .from("note_cookie_vault")
      .select("note_id, domain, cookie_count, updated_at, source_browser, updated_by")
      .in("note_id", [...new Set(noteIds)]);
    data = res.data as CookieVaultRow[] | null;
    error = res.error;
    if (error && /updated_by|column/i.test(error.message ?? "")) {
      const fallback = await supabase
        .from("note_cookie_vault")
        .select("note_id, domain, cookie_count, updated_at, source_browser")
        .in("note_id", [...new Set(noteIds)]);
      data = (fallback.data ?? []).map((row) => ({
        ...(row as CookieVaultRow),
        updated_by: (row as CookieVaultRow).source_browser,
      }));
      error = fallback.error;
    }

    setLoading(false);
    if (error) {
      const msg = error.message ?? String(error);
      if (/note_cookie_vault|does not exist|schema cache/i.test(msg)) {
        setVaultError("Run migrations — docs/SUPABASE-P0020.md (pnpm generate:apply-all)");
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
  }, [session, vaultQueryKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { vaultByKey, vaultError, vaultLoading: loading, refreshVault: refresh };
}

export function vaultKey(noteId: string, domain: string) {
  return `${noteId}:${domain}`;
}
