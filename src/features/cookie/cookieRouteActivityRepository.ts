import { supabase } from "../../lib/supabase";
import { cookieRouteDomainKey } from "./cookieRouteDomain";

export type CookieRouteUserActivity = {
  user_id: string;
  user_email?: string | null;
  last_load_at?: string | null;
  last_sync_at?: string | null;
};

function rpcError(error: unknown, fallback: string) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error ?? "");
  if (/cookie_route_user_activity|cookie_route_record_load|schema cache|PGRST|does not exist/i.test(message)) {
    return "Route activity schema is missing. Run supabase/migrations/20260604120000_cookie_route_user_activity.sql.";
  }
  return message || fallback;
}

function envelopeError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error?: unknown }).error ?? fallback);
  }
  return fallback;
}

export async function listCookieRouteActivity(
  noteId: string,
  domain: string,
): Promise<{ ok: true; activities: CookieRouteUserActivity[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("cookie_route_activity_list", {
    p_note_id: noteId,
    p_domain: cookieRouteDomainKey(domain),
  });
  if (error) return { ok: false, error: rpcError(error, "Load activity failed.") };
  if (!data || data.ok !== true) return { ok: false, error: envelopeError(data, "Load activity failed.") };
  return { ok: true, activities: (data.activities ?? []) as CookieRouteUserActivity[] };
}
