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
};

type CloudResult<T> = { ok: true } & T | { ok: false; error: string };

function routeKey(noteId: string, domain: string) {
  return `${noteId.trim()}:${normalizeCookieDomain(domain)}`;
}

function routeError(err: unknown, fallback: string) {
  const message = err && typeof err === "object" && "message" in err ? String(err.message) : String(err ?? "");
  if (/cookie_bridge_routes|schema cache|does not exist|PGRST/i.test(message)) {
    return "Cloud routes table is missing. Run supabase/migrations/20260525133000_cookie_bridge_routes.sql.";
  }
  return message || fallback;
}

export async function pushCookieRoutesToCloud(
  session: Session | null,
  bindings: CookieBinding[],
): Promise<CloudResult<{ count: number }>> {
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const rows = bindings
    .filter((b) => b.enabled && b.noteId?.trim() && normalizeCookieDomain(b.domain))
    .map((b) => {
      const sourceBrowserId = b.sourceBrowserId?.trim();
      return {
        user_id: session.user.id,
        note_id: b.noteId.trim(),
        sync_id: b.syncId?.trim() || null,
        domain: normalizeCookieDomain(b.domain),
        note_title: b.noteTitle?.trim() || null,
        ...(sourceBrowserId
          ? {
              source_browser_id: sourceBrowserId,
              source_label: b.sourceLabel?.trim() || null,
              source_locked_at: new Date().toISOString(),
            }
          : {}),
        enabled: true,
      };
    });

  if (!rows.length) return { ok: true, count: 0 };

  const { error } = await supabase
    .from("cookie_bridge_routes")
    .upsert(rows, { onConflict: "user_id,note_id,domain" });

  if (error) return { ok: false, error: routeError(error, "Push cloud routes failed.") };
  return { ok: true, count: rows.length };
}

export async function pullCookieRoutesFromCloud(
  session: Session | null,
  existing: CookieBinding[],
  notes: NoteListItem[],
): Promise<CloudResult<{ count: number; bindings: CookieBinding[] }>> {
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

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
      if (legacy.error) return { ok: false, error: routeError(legacy.error, "Pull cloud routes failed.") };
      routeData = legacy.data?.map((row) => ({
        ...row,
        source_browser_id: null,
        source_label: null,
        source_locked_at: null,
      }));
    } else {
      return { ok: false, error: routeError(error, "Pull cloud routes failed.") };
    }
  }

  const rows = (routeData ?? []) as CookieCloudRouteRow[];
  const byKey = new Map(existing.map((b) => [routeKey(b.noteId, b.domain), b]));
  const merged = new Map(existing.map((b) => [routeKey(b.noteId, b.domain), b]));

  for (const row of rows) {
    const domain = normalizeCookieDomain(row.domain);
    if (!row.note_id?.trim() || !domain) continue;
    const key = routeKey(row.note_id, domain);
    const prev = byKey.get(key);
    const note = notes.find((n) => n.id === row.note_id);
    merged.set(key, {
      id: prev?.id ?? `cloud-${row.id}`,
      enabled: true,
      noteId: row.note_id,
      syncId: row.sync_id ?? note?.sync_id ?? "",
      domain,
      pass: prev?.pass,
      requiresPass: prev?.requiresPass ?? Boolean(note?.sync_pass_hash),
      noteTitle: row.note_title ?? note?.title ?? prev?.noteTitle,
      useNoteIdRpc: !(row.sync_id ?? note?.sync_id)?.trim(),
      sourceBrowserId: row.source_browser_id ?? prev?.sourceBrowserId ?? null,
      sourceLabel: row.source_label ?? prev?.sourceLabel ?? null,
    });
  }

  return { ok: true, count: rows.length, bindings: Array.from(merged.values()) };
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
