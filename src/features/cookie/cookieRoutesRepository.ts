import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { NoteListItem } from "../notes/types";
import type { CookieBinding } from "./cookieBridge";
import { normalizeCookieDomain } from "./normalizeCookieDomain";

export type CookieCloudRouteRow = {
  id: string;
  user_id: string;
  note_id: string;
  sync_id: string | null;
  domain: string;
  note_title: string | null;
  enabled: boolean;
  source_browser_id: string | null;
  source_label: string | null;
  source_locked_at: string | null;
  updated_at: string;
  owner_user_id?: string | null;
  owner_email?: string | null;
  access_role?: "owner" | "member" | string | null;
  can_apply?: boolean | null;
  can_publish?: boolean | null;
  can_manage?: boolean | null;
};

type CloudResult<T> = ({ ok: true } & T) | { ok: false; error: string };

function routeKey(noteId: string, domain: string) {
  return `${noteId.trim()}:${normalizeCookieDomain(domain)}`;
}

function cloudRowFromBinding(session: Session, binding: CookieBinding) {
  const sourceBrowserId = binding.sourceBrowserId?.trim();
  return {
    user_id: session.user.id,
    note_id: binding.noteId.trim(),
    sync_id: binding.syncId?.trim() || null,
    domain: normalizeCookieDomain(binding.domain),
    note_title: binding.noteTitle?.trim() || null,
    ...(sourceBrowserId
      ? {
          source_browser_id: sourceBrowserId,
          source_label: binding.sourceLabel?.trim() || null,
          source_locked_at: new Date().toISOString(),
        }
      : {}),
    enabled: true,
  };
}

function routeError(err: unknown, fallback: string) {
  const message = err && typeof err === "object" && "message" in err ? String(err.message) : String(err ?? "");
  if (/cookie_bridge_routes|schema cache|does not exist|PGRST/i.test(message)) {
    return "Cloud routes table is missing. Run supabase/migrations/20260525133000_cookie_bridge_routes.sql.";
  }
  return message || fallback;
}

export function mergeCookieRoutes(
  existing: CookieBinding[],
  rows: CookieCloudRouteRow[],
  notes: NoteListItem[],
  opts: { replace?: boolean } = {},
): CookieBinding[] {
  const byKey = new Map(existing.map((b) => [routeKey(b.noteId, b.domain), b]));
  const merged = new Map(opts.replace ? [] : existing.map((b) => [routeKey(b.noteId, b.domain), b]));
  const notesById = new Map(notes.map((note) => [note.id, note]));

  for (const row of rows) {
    const domain = normalizeCookieDomain(row.domain);
    if (!row.note_id?.trim() || !domain) continue;
    const key = routeKey(row.note_id, domain);
    const prev = byKey.get(key);
    const note = notesById.get(row.note_id);
    merged.set(key, {
      id: prev?.id ?? `cloud-${row.id}`,
      enabled: true,
      noteId: row.note_id,
      syncId: row.sync_id ?? note?.sync_id ?? "",
      domain,
      pass: prev?.pass,
      requiresPass: prev?.requiresPass ?? Boolean(note?.sync_pass_hash),
      noteTitle: note?.title?.trim() || row.note_title?.trim() || prev?.noteTitle,
      useNoteIdRpc: !(row.sync_id ?? note?.sync_id)?.trim(),
      sourceBrowserId: row.source_browser_id ?? prev?.sourceBrowserId ?? null,
      sourceLabel: row.source_label ?? prev?.sourceLabel ?? null,
      ownerUserId: row.owner_user_id ?? row.user_id ?? prev?.ownerUserId ?? null,
      ownerUserEmail: row.owner_email ?? prev?.ownerUserEmail ?? null,
      accessRole: row.access_role === "member" ? "member" : "owner",
      canApply: row.can_apply ?? true,
      canPublish: row.can_publish ?? row.access_role !== "member",
      canManage: row.can_manage ?? row.access_role !== "member",
    });
  }

  return Array.from(merged.values());
}

export async function upsertCookieRouteToCloud(
  session: Session | null,
  binding: CookieBinding,
): Promise<CloudResult<{ route: CookieCloudRouteRow }>> {
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  if (!binding.enabled || !binding.noteId?.trim() || !normalizeCookieDomain(binding.domain)) {
    return { ok: false, error: "Route requires Note ID and domain." };
  }

  const { data, error } = await supabase
    .from("cookie_bridge_routes")
    .upsert(cloudRowFromBinding(session, binding), { onConflict: "user_id,note_id,domain" })
    .select("id,user_id,note_id,sync_id,domain,note_title,enabled,source_browser_id,source_label,source_locked_at,updated_at")
    .single();

  if (error) return { ok: false, error: routeError(error, "Save cloud route failed.") };
  return { ok: true, route: data as CookieCloudRouteRow };
}

export async function disableCookieRouteInCloud(
  session: Session | null,
  binding: CookieBinding,
): Promise<CloudResult<{ disabled: boolean }>> {
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const noteId = binding.noteId?.trim();
  const domain = normalizeCookieDomain(binding.domain);
  if (!noteId || !domain) return { ok: false, error: "Route requires Note ID and domain." };

  const { error } = await supabase
    .from("cookie_bridge_routes")
    .update({ enabled: false })
    .eq("user_id", session.user.id)
    .eq("note_id", noteId)
    .eq("domain", domain);

  if (error) return { ok: false, error: routeError(error, "Disable cloud route failed.") };
  return { ok: true, disabled: true };
}

export async function getCookieRoutePublishStatus(
  session: Session | null,
  binding: CookieBinding,
): Promise<CloudResult<{ published: boolean; updatedAt: string | null }>> {
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const noteId = binding.noteId?.trim();
  const domain = normalizeCookieDomain(binding.domain);
  if (!noteId || !domain) return { ok: true, published: false, updatedAt: null };

  const { data, error } = await supabase
    .from("cookie_bridge_routes")
    .select("id,updated_at")
    .eq("user_id", session.user.id)
    .eq("note_id", noteId)
    .eq("domain", domain)
    .eq("enabled", true)
    .maybeSingle();

  if (error) return { ok: false, error: routeError(error, "Check route publish status failed.") };
  return { ok: true, published: Boolean(data?.id), updatedAt: data?.updated_at ?? null };
}

export async function fetchEnabledCloudRoutesForNote(
  session: Session | null,
  noteId: string,
): Promise<CloudResult<{ routes: CookieCloudRouteRow[] }>> {
  const id = noteId.trim();
  if (!session?.user?.id || !id) return { ok: true, routes: [] };

  const { data, error } = await supabase
    .from("cookie_bridge_routes")
    .select("id,user_id,note_id,sync_id,domain,note_title,enabled,updated_at")
    .eq("note_id", id)
    .eq("enabled", true)
    .order("updated_at", { ascending: false });

  if (!error) {
    return { ok: true, routes: (data ?? []) as CookieCloudRouteRow[] };
  }

  let accessible = await supabase.rpc("note_cookie_routes_accessible_v2");
  if (accessible.error && /note_cookie_routes_accessible_v2|PGRST202|Could not find|schema cache|404/i.test(accessible.error.message ?? "")) {
    accessible = await supabase.rpc("note_cookie_routes_accessible");
  }
  if (!accessible.error && Array.isArray(accessible.data)) {
    const routes = (accessible.data as CookieCloudRouteRow[]).filter(
      (row) => row.note_id === id && row.enabled !== false,
    );
    return { ok: true, routes };
  }

  return { ok: false, error: routeError(error, "Load routes for note failed.") };
}

export async function pullCookieRoutesFromCloud(
  session: Session | null,
  existing: CookieBinding[],
  notes: NoteListItem[],
): Promise<CloudResult<{ count: number; bindings: CookieBinding[] }>> {
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  let accessible = await supabase.rpc("note_cookie_routes_accessible_v2");
  if (accessible.error && /note_cookie_routes_accessible_v2|PGRST202|Could not find|schema cache|404/i.test(accessible.error.message ?? "")) {
    accessible = await supabase.rpc("note_cookie_routes_accessible");
  }
  if (!accessible.error && Array.isArray(accessible.data)) {
    const rows = accessible.data as CookieCloudRouteRow[];
    return { ok: true, count: rows.length, bindings: mergeCookieRoutes(existing, rows, notes, { replace: true }) };
  }

  const { data, error } = await supabase
    .from("cookie_bridge_routes")
    .select("id,user_id,note_id,sync_id,domain,note_title,enabled,source_browser_id,source_label,source_locked_at,updated_at")
    .eq("enabled", true)
    .order("updated_at", { ascending: false });

  let routeData = data;
  if (error) {
    const message = error.message ?? "";
    if (/source_browser_id|source_label|source_locked_at|schema cache|PGRST/i.test(message)) {
      const legacy = await supabase
        .from("cookie_bridge_routes")
        .select("id,user_id,note_id,sync_id,domain,note_title,enabled,updated_at")
        .eq("enabled", true)
        .order("updated_at", { ascending: false });
      if (legacy.error) return { ok: false, error: routeError(legacy.error, "Refresh cloud routes failed.") };
      routeData = legacy.data?.map((row) => ({
        ...row,
        source_browser_id: null,
        source_label: null,
        source_locked_at: null,
      }));
    } else {
      return { ok: false, error: routeError(error, "Refresh cloud routes failed.") };
    }
  }

  const rows = (routeData ?? []) as CookieCloudRouteRow[];
  return { ok: true, count: rows.length, bindings: mergeCookieRoutes(existing, rows, notes, { replace: true }) };
}

export async function setCookieRouteSource(
  session: Session | null,
  binding: CookieBinding,
  sourceBrowserId: string,
  sourceLabel?: string | null,
): Promise<CloudResult<{ sourceBrowserId: string; sourceLabel: string | null }>> {
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };
  const noteId = binding.noteId?.trim();
  const domain = normalizeCookieDomain(binding.domain);
  if (!noteId || !domain || !sourceBrowserId.trim()) {
    return { ok: false, error: "Route and source browser are required." };
  }

  const sourceLabelValue = sourceLabel?.trim() || null;
  const { error } = await supabase
    .from("cookie_bridge_routes")
    .upsert(
      {
        user_id: session.user.id,
        note_id: noteId,
        sync_id: binding.syncId?.trim() || null,
        domain,
        note_title: binding.noteTitle?.trim() || null,
        enabled: true,
        source_browser_id: sourceBrowserId.trim(),
        source_label: sourceLabelValue,
        source_locked_at: new Date().toISOString(),
      },
      { onConflict: "user_id,note_id,domain" },
    );

  if (error) return { ok: false, error: routeError(error, "Set source browser failed.") };
  return { ok: true, sourceBrowserId: sourceBrowserId.trim(), sourceLabel: sourceLabelValue };
}
