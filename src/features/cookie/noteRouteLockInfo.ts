import type { CookieBinding } from "./cookieBridge";
import { normalizeCookieDomain } from "./normalizeCookieDomain";
import type { CookieCloudRouteRow } from "./cookieRoutesRepository";

export type NoteRouteLockInfo = {
  domain: string;
  syncId: string | null;
  noteTitle: string | null;
};

export function mergeNoteRouteLockInfo(
  cloud: CookieCloudRouteRow[],
  local: CookieBinding[],
): NoteRouteLockInfo[] {
  const byDomain = new Map<string, NoteRouteLockInfo>();

  for (const row of cloud) {
    const domain = normalizeCookieDomain(row.domain);
    if (!domain) continue;
    byDomain.set(domain, {
      domain,
      syncId: row.sync_id?.trim() || null,
      noteTitle: row.note_title?.trim() || null,
    });
  }

  for (const binding of local) {
    if (!binding.enabled) continue;
    const domain = normalizeCookieDomain(binding.domain);
    if (!domain || byDomain.has(domain)) continue;
    byDomain.set(domain, {
      domain,
      syncId: binding.syncId?.trim() || null,
      noteTitle: binding.noteTitle?.trim() || null,
    });
  }

  return Array.from(byDomain.values());
}

/** Native tooltip for route modal opener (domain + lock status). */
export function formatRouteOpenTooltip(route: NoteRouteLockInfo): string {
  const lockLine = route.syncId
    ? `Lock: active · Sync ID ${route.syncId}`
    : "Lock: active · Sync via note ID";
  const lines = [route.domain, lockLine];
  if (route.noteTitle?.trim()) {
    lines.push(`Route title: ${route.noteTitle.trim()}`);
  }
  lines.push("Click to open route detail");
  return lines.join("\n");
}

export function formatRouteOpenAriaLabel(route: NoteRouteLockInfo): string {
  const site = route.domain;
  const lock = route.syncId ? `active, sync ${route.syncId}` : "active, sync via note ID";
  return `Open route detail for ${site}. Lock ${lock}.`;
}

export function formatNoteRouteLockSummary(routes: NoteRouteLockInfo[]): string {
  if (!routes.length) return "";
  return routes
    .map((r) => {
      const parts = [r.domain];
      if (r.syncId) parts.push(`sync ${r.syncId}`);
      if (r.noteTitle) parts.push(r.noteTitle);
      return parts.join(" · ");
    })
    .join(" | ");
}
