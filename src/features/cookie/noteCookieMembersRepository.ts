import { normalizeGranteeEmail } from "./normalizeGranteeEmail";
import { supabase } from "../../lib/supabase";
import type { CookieCloudRouteRow } from "./cookieRoutesRepository";
import { normalizeCookieDomain } from "./normalizeCookieDomain";

export type NoteCookieMemberRow = {
  id: string;
  note_id: string;
  owner_user_id: string;
  grantee_user_id: string | null;
  grantee_email: string | null;
  can_apply: boolean;
  can_publish: boolean;
  can_manage: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type RpcEnvelope<T> = ({ ok: true } & T) | { ok: false; error: string };
type RpcVoid = { ok: true } | { ok: false; error: string };

function rpcError(error: unknown, fallback: string) {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : String(error ?? "");
  if (/note_cookie_members|note_cookie_member|schema cache|PGRST|does not exist/i.test(message)) {
    return "Cookie member schema is missing. Run supabase/migrations/20260528153000_note_cookie_members.sql.";
  }
  return message || fallback;
}

function envelopeError(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "error" in data) {
    const code = String((data as { error?: unknown }).error ?? fallback);
    if (code === "route_not_found") return "Route is shared but not published yet. Ask the owner to share again from route detail.";
    if (code === "forbidden_or_not_shared") return "This Note ID is not shared with the current account.";
    return code;
  }
  return fallback;
}

export async function listNoteCookieMembers(noteId: string): Promise<RpcEnvelope<{ members: NoteCookieMemberRow[] }>> {
  const { data, error } = await supabase.rpc("note_cookie_member_list", { p_note_id: noteId });
  if (error) return { ok: false, error: rpcError(error, "Load members failed.") };
  if (!data || data.ok !== true) return { ok: false, error: envelopeError(data, "Load members failed.") };
  return { ok: true, members: (data.members ?? []) as NoteCookieMemberRow[] };
}

export async function upsertNoteCookieMember(opts: {
  noteId: string;
  email: string;
  canApply: boolean;
  canPublish: boolean;
  canManage: boolean;
  expiresAt?: string | null;
}): Promise<RpcEnvelope<{ member: NoteCookieMemberRow }>> {
  const { data, error } = await supabase.rpc("note_cookie_member_upsert", {
    p_note_id: opts.noteId,
    p_grantee_email: normalizeGranteeEmail(opts.email),
    p_can_apply: opts.canApply,
    p_can_publish: opts.canPublish,
    p_can_manage: opts.canManage,
    p_expires_at: opts.expiresAt?.trim() || null,
  });
  if (error) return { ok: false, error: rpcError(error, "Save member failed.") };
  if (!data || data.ok !== true) return { ok: false, error: envelopeError(data, "Save member failed.") };
  return { ok: true, member: data.member as NoteCookieMemberRow };
}

export async function revokeNoteCookieMember(memberId: string): Promise<RpcVoid> {
  const { data, error } = await supabase.rpc("note_cookie_member_revoke", { p_member_id: memberId });
  if (error) return { ok: false, error: rpcError(error, "Revoke member failed.") };
  if (!data || data.ok !== true) return { ok: false, error: envelopeError(data, "Revoke member failed.") };
  return { ok: true };
}

export async function joinCookieRouteByNoteId(opts: {
  noteId: string;
  domain?: string;
}): Promise<RpcEnvelope<{ route: CookieCloudRouteRow }>> {
  const { data, error } = await supabase.rpc("note_cookie_route_join", {
    p_note_id: opts.noteId.trim(),
    p_domain: opts.domain ? normalizeCookieDomain(opts.domain) : null,
  });
  if (error) return { ok: false, error: rpcError(error, "Join route failed.") };
  if (!data || data.ok !== true) return { ok: false, error: envelopeError(data, "Join route failed.") };
  return { ok: true, route: data.route as CookieCloudRouteRow };
}
