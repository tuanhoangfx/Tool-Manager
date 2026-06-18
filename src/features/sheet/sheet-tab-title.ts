import { parseGoogleSheetLink } from "./google-sheet-link";
import type { SheetSource } from "./sheet-sources";

function decodeHtmlText(s: string) {
  return s
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

/** Strip Google suffix from gviz `<title>` (tab or spreadsheet label). */
export function cleanSheetGvizTitle(raw: string): string {
  return raw
    .replace(/\s*[-–—]\s*Google\s+Sheets\s*$/i, "")
    .replace(/\s*[-–—]\s*Google\s+Drive\s*$/i, "")
    .trim();
}

/** Tab title from gviz HTML `<title>` (e.g. "🌐 Web"). */
export async function fetchSheetTabTitle(source: Pick<SheetSource, "rawUrl" | "gid">): Promise<string | null> {
  try {
    const info = parseGoogleSheetLink(source.rawUrl);
    if (info.kind !== "doc" || !info.sheetId) return null;
    const gid = source.gid ?? info.gid ?? "0";
    const htmlUrl = `https://docs.google.com/spreadsheets/d/${info.sheetId}/gviz/tq?tqx=out:html&gid=${encodeURIComponent(gid)}`;
    const res = await fetch(htmlUrl, { method: "GET" });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/<title>([^<]+)<\/title>/i);
    const title = m?.[1] ? cleanSheetGvizTitle(decodeHtmlText(m[1])) : "";
    return title || null;
  } catch {
    return null;
  }
}

export function shouldSyncSheetTabTitle(source: Pick<SheetSource, "title" | "titleSource">): boolean {
  if (source.titleSource === "manual") return false;
  if (source.titleSource === "auto") return true;
  return /^Sheet gid:\d+$/i.test(source.title);
}
