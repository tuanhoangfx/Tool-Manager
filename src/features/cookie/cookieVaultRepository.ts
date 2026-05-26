import { supabase } from "../../lib/supabase";
import type { CookieVaultRow } from "./useCookieVaultMap";

export async function fetchCookieVaultRows(noteIds: string[]) {
  const uniqueNoteIds = [...new Set(noteIds.filter(Boolean))];
  if (!uniqueNoteIds.length) return { data: [] as CookieVaultRow[], error: null };

  const accessible = await supabase.rpc("note_cookie_vault_summaries_accessible");
  if (!accessible.error && Array.isArray(accessible.data)) {
    const allowed = new Set(uniqueNoteIds);
    return {
      data: (accessible.data as CookieVaultRow[]).filter((row) => allowed.has(row.note_id)),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("note_cookie_vault")
    .select("note_id, domain, cookie_count, updated_at, source_browser, updated_by")
    .in("note_id", uniqueNoteIds);

  return { data: (data ?? []) as CookieVaultRow[], error };
}

export function mapVaultRows(rows: CookieVaultRow[]): Record<string, CookieVaultRow> {
  const map: Record<string, CookieVaultRow> = {};
  for (const row of rows) {
    map[`${row.note_id}:${row.domain}`] = row;
  }
  return map;
}
