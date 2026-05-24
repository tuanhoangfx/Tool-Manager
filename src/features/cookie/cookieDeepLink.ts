/** Parse ?screen=cookie&note=uuid&sync=TM-…&domain=&pass= from URL */

export type CookieDeepLink = {
  noteId: string | null;
  syncId: string | null;
  domain: string | null;
  pass: string | null;
};

export function readCookieDeepLink(): CookieDeepLink {
  if (typeof window === "undefined") {
    return { noteId: null, syncId: null, domain: null, pass: null };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    noteId: p.get("note")?.trim() || null,
    syncId: p.get("sync")?.trim() || null,
    domain: p.get("domain")?.trim() || null,
    pass: p.get("pass")?.trim() || null,
  };
}

export function hasCookieDeepLink(link: CookieDeepLink): boolean {
  return Boolean((link.noteId || link.syncId) && link.domain);
}
