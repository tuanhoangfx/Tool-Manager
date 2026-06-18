import { SHEET_GRID_DEFAULT_COL_WIDTH } from "./sheet-grid-prefs";

function normHeader(label: string): string {
  return String(label ?? "")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .toLowerCase();
}

/** Default pixel width per semantic column role (first load / header change). */
export function resolveSheetColumnHintWidth(label: string): number {
  const t = normHeader(label);
  if (!t || t === "—") return SHEET_GRID_DEFAULT_COL_WIDTH;
  if (/^project$/.test(t) || /^platform$/.test(t)) return 128;
  if (/^category$/.test(t)) return 140;
  if (/^question$/.test(t)) return 132;
  if (/^answer$/.test(t)) return 300;
  if (/processing/.test(t)) return 120;
  if (/^note$/.test(t)) return 120;
  if (/hyper|link|url/.test(t)) return 200;
  return SHEET_GRID_DEFAULT_COL_WIDTH;
}

/** Seed resize weights from header labels when no saved widths exist. */
export function seedSheetGridColumnWidths(header: string[]): Record<string, number> {
  const widths: Record<string, number> = {};
  header.forEach((label, i) => {
    widths[String(i)] = resolveSheetColumnHintWidth(label);
  });
  return widths;
}
