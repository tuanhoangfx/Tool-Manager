/** Hide only 100% empty columns (no label + no cell data). */

const AUTO_HIDE_SAMPLE_ROWS = 200;

function columnFillRate(rows: string[][], colIndex: number): number {
  const sample = rows.length > AUTO_HIDE_SAMPLE_ROWS ? rows.slice(0, AUTO_HIDE_SAMPLE_ROWS) : rows;
  if (sample.length === 0) return 0;
  let filled = 0;
  for (const row of sample) {
    if (String(row[colIndex] ?? "").trim()) filled++;
  }
  return filled / sample.length;
}

/** Hidden column indices — unnamed columns with zero data in sample rows. */
export function computeAutoHiddenColumnIndices(header: string[], rows: string[][]): number[] {
  const hidden: number[] = [];
  for (let i = 0; i < header.length; i++) {
    const label = String(header[i] ?? "").trim();
    if (label && label !== "—") continue;
    if (columnFillRate(rows, i) === 0) hidden.push(i);
  }
  return hidden;
}

/** @deprecated No cap — kept for tests/docs only. */
export const SHEET_GRID_MAX_AUTO_VISIBLE_COLS = 6;
