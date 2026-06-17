export type GoogleSheetLinkKind = "doc" | "publish" | "unknown";

export type GoogleSheetLinkInfo = {
  kind: GoogleSheetLinkKind;
  sheetId?: string;
  publishId?: string;
  gid?: string;
};

function safeUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

export function parseGoogleSheetLink(raw: string): GoogleSheetLinkInfo {
  const url = safeUrl(raw.trim());
  if (!url) return { kind: "unknown" };

  // Published-to-web link: /spreadsheets/d/e/<publishId>/pubhtml?gid=...
  const publishMatch = url.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)\//i);
  if (publishMatch?.[1]) {
    const gid = url.searchParams.get("gid")?.trim() || undefined;
    return { kind: "publish", publishId: publishMatch[1], gid };
  }

  // Standard doc link: /spreadsheets/d/<sheetId>/edit...
  const docMatch = url.pathname.match(/\/spreadsheets\/d\/([^/]+)\//i);
  if (docMatch?.[1]) {
    const gid =
      url.hash.match(/gid=(\d+)/)?.[1] ??
      url.searchParams.get("gid")?.trim() ??
      undefined;
    return { kind: "doc", sheetId: docMatch[1], gid };
  }

  return { kind: "unknown" };
}

export function toGoogleSheetCsvUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  const info = parseGoogleSheetLink(raw);
  const gid = info.gid ?? "0";

  if (info.kind === "doc" && info.sheetId) {
    // Prefer gviz out:csv to avoid export redirects (more CORS-friendly in browser fetch).
    return {
      ok: true,
      url: `https://docs.google.com/spreadsheets/d/${info.sheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`,
    };
  }

  if (info.kind === "publish" && info.publishId) {
    return {
      ok: true,
      url: `https://docs.google.com/spreadsheets/d/e/${info.publishId}/pub?gid=${encodeURIComponent(gid)}&single=true&output=csv`,
    };
  }

  return {
    ok: false,
    error:
      "Link không đúng định dạng Google Sheet. Hỗ trợ: /spreadsheets/d/<id>/edit#gid=... hoặc publish /d/e/<publishId>/pubhtml?gid=...",
  };
}

