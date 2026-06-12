import { ensureDataBoxAuth } from "../../lib/ensure-data-box-auth";
import { supabase } from "../../lib/supabase";
import { cookieRouteDomainKey } from "./cookieRouteDomain";
import type { CookieVaultRow } from "./useCookieVaultMap";

export async function fetchCookieVaultRows(noteIds: string[]) {
  const uniqueNoteIds = [...new Set(noteIds.filter(Boolean))];
  if (!uniqueNoteIds.length) return { data: [] as CookieVaultRow[], error: null };

  const session = await ensureDataBoxAuth();
  if (!session) {
    return { data: [], error: new Error("Sign in to load cookie vault.") };
  }

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

export function vaultRouteKey(noteId: string, domain: string): string {
  const id = noteId.trim();
  const dom = cookieRouteDomainKey(domain);
  return id && dom ? `${id}:${dom}` : "";
}

export function lookupVaultRow(
  map: Record<string, CookieVaultRow>,
  noteId: string,
  domain: string,
): CookieVaultRow | undefined {
  const key = vaultRouteKey(noteId, domain);
  if (!key) return undefined;
  if (map[key]) return map[key];
  const id = noteId.trim();
  const raw = domain.trim();
  if (map[`${id}:${raw}`]) return map[`${id}:${raw}`];
  const bare = raw.replace(/^\./, "");
  if (bare !== raw && map[`${id}:${bare}`]) return map[`${id}:${bare}`];
  if (bare !== raw && map[`${id}:.${bare}`]) return map[`${id}:.${bare}`];
  return undefined;
}

export function mapVaultRows(rows: CookieVaultRow[]): Record<string, CookieVaultRow> {
  const map: Record<string, CookieVaultRow> = {};
  for (const row of rows) {
    const key = vaultRouteKey(row.note_id, row.domain);
    if (!key) continue;
    map[key] = row;
  }
  return map;
}
