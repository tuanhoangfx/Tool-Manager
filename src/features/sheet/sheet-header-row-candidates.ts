import { csvToMatrix, rowLooksLikeHeader } from "./sheet-csv-grid";

export type SheetHeaderRowCandidate = {
  index: number;
  /** Short preview for picker label */
  preview: string;
};

function previewRow(row: string[], maxCells = 4): string {
  const cells = row
    .map((c) => String(c ?? "").trim())
    .filter(Boolean)
    .slice(0, maxCells);
  if (!cells.length) return "(empty row)";
  const joined = cells.join(" · ");
  return joined.length > 72 ? `${joined.slice(0, 69)}…` : joined;
}

/** List rows that look like a header — for manual override when sheet has spacer rows. */
export function buildHeaderRowCandidates(csv: string, maxScan = 15): SheetHeaderRowCandidate[] {
  const matrix = csvToMatrix(csv);
  const limit = Math.min(matrix.length, maxScan);
  const out: SheetHeaderRowCandidate[] = [];
  for (let i = 0; i < limit; i++) {
    const row = matrix[i] ?? [];
    if (!rowLooksLikeHeader(row)) continue;
    out.push({ index: i, preview: previewRow(row) });
  }
  return out;
}
