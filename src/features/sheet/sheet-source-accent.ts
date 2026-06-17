const SHEET_ACCENT_COLORS = ["#38bdf8", "#fb923c", "#a78bfa", "#34d399", "#f472b6", "#facc15"] as const;

/** Stable accent dot per sheet source (rail name column). */
export function sheetSourceAccentColor(sourceId: string): string {
  let hash = 0;
  for (let i = 0; i < sourceId.length; i += 1) {
    hash = (hash * 31 + sourceId.charCodeAt(i)) >>> 0;
  }
  return SHEET_ACCENT_COLORS[hash % SHEET_ACCENT_COLORS.length]!;
}
