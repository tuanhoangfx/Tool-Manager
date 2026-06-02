/** Parse ?screen=cookie&note=uuid&sync=TM-…&domain=&pass= from URL */

export type CookieDeepLink = {
  noteId: string | null;
  syncId: string | null;
  domain: string | null;
  pass: string | null;
  /** Open route detail modal on Cookie Auto screen. */
  openRouteDetail: boolean;
};

export function readCookieDeepLink(): CookieDeepLink {
  if (typeof window === "undefined") {
    return { noteId: null, syncId: null, domain: null, pass: null, openRouteDetail: false };
  }
  const p = new URLSearchParams(window.location.search);
  return {
    noteId: p.get("note")?.trim() || null,
    syncId: p.get("sync")?.trim() || null,
    domain: p.get("domain")?.trim() || null,
    pass: p.get("pass")?.trim() || null,
    openRouteDetail: p.get("routeDetail") === "1" || p.get("detail") === "1",
  };
}

export function hasCookieDeepLink(link: CookieDeepLink): boolean {
  return Boolean((link.noteId || link.syncId) && link.domain);
}

/** Path + query for Cookie Auto tab (e.g. /cookie?note=…&sync=…&domain=…). */
export function buildCookieAutoDeepLinkSearch(opts: {
  noteId?: string | null;
  syncId?: string | null;
  domain?: string | null;
  openRouteDetail?: boolean;
}): string {
  const p = new URLSearchParams();
  if (opts.noteId?.trim()) p.set("note", opts.noteId.trim());
  if (opts.syncId?.trim()) p.set("sync", opts.syncId.trim());
  if (opts.domain?.trim()) p.set("domain", opts.domain.trim());
  if (opts.openRouteDetail) p.set("routeDetail", "1");
  return p.toString();
}
