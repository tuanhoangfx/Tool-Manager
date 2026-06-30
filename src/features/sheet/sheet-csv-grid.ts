import type { SheetGridData } from "./sheet-grid-types";

export type SheetCsvParseResult = {
  grid: SheetGridData;
  headerRowIndex: number;
};

export const SHEET_LAZY_PARSE_ROW_THRESHOLD = 500;

function normCell(v: unknown): string {
  const s = String(v ?? "").trim();
  if (s === "undefined" || s === "null") return "";
  return s;
}

/** Skip spacer rows (e.g. lone "r") before the real header row. */
export function detectHeaderRowIndex(matrix: string[][]): number {
  const maxScan = Math.min(matrix.length, 30);
  for (let i = 0; i < maxScan; i++) {
    const row = matrix[i] ?? [];
    const cells = row.map(normCell).filter(Boolean);
    if (cells.length < 2) continue;
    const urlLike = cells.filter((c) => /^https?:\/\//i.test(c)).length;
    if (urlLike >= 2) continue;
    return i;
  }
  return 0;
}

export function rowLooksLikeHeader(row: string[]): boolean {
  const cells = row.map(normCell).filter(Boolean);
  if (cells.length < 2) return false;
  const urlLike = cells.filter((c) => /^https?:\/\//i.test(c)).length;
  return urlLike < 2;
}

/** Use stored index when still valid; otherwise auto-detect. */
export function resolveHeaderRowIndex(matrix: string[][], stored?: number): number {
  if (typeof stored === "number" && stored >= 0 && stored < matrix.length) {
    const row = matrix[stored] ?? [];
    if (rowLooksLikeHeader(row)) return stored;
  }
  return detectHeaderRowIndex(matrix);
}

/** Pad every row to the same width so header/body columns stay aligned. */
export function padMatrixRows(matrix: string[][]): string[][] {
  const maxCols = matrix.reduce((max, row) => Math.max(max, row.length), 0);
  if (maxCols === 0) return matrix;
  return matrix.map((row) => {
    const next = [...row];
    while (next.length < maxCols) next.push("");
    return next;
  });
}

function lastNonEmptyIndex(row: string[]): number {
  for (let i = row.length - 1; i >= 0; i--) {
    if (normCell(row[i])) return i;
  }
  return -1;
}

function firstNonEmptyIndex(row: string[]): number {
  for (let i = 0; i < row.length; i++) {
    if (normCell(row[i])) return i;
  }
  return 0;
}

/** Slice from shared leading column so header/data share the same origin. */
export function alignColumnStart(header: string[], rows: string[][]): { header: string[]; rows: string[][] } {
  const hStart = firstNonEmptyIndex(header);
  const dStarts = rows
    .slice(0, 40)
    .map((r) => firstNonEmptyIndex(r))
    .filter((i) => i >= 0);
  const dStart = dStarts.length ? dStarts[Math.floor(dStarts.length / 2)]! : 0;
  const from = Math.min(hStart, dStart);
  if (from <= 0) return { header, rows };
  return {
    header: header.slice(from),
    rows: rows.map((r) => r.slice(from)),
  };
}

/** Merge row above header for empty header cells (multi-row Google Sheet headers). */
export function mergeHeaderWithPreviousRow(matrix: string[][], headerRowIndex: number): string[] {
  const header = (matrix[headerRowIndex] ?? []).map(normCell);
  if (headerRowIndex <= 0) return header.map((v) => v || "—");
  const above = (matrix[headerRowIndex - 1] ?? []).map(normCell);
  const len = Math.max(header.length, above.length);
  const merged: string[] = [];
  for (let i = 0; i < len; i++) {
    const h = normCell(header[i]);
    const a = normCell(above[i]);
    merged.push(h || a || "—");
  }
  return merged;
}

/**
 * Drop uniform spacer columns only when data is wider than the header row
 * (misaligned CSV export). Named header columns are always kept — e.g. Category
 * with uniform "Information" must remain visible.
 */
export function dropUniformSpacerColumns(
  header: string[],
  rows: string[][],
): { header: string[]; rows: string[][] } {
  if (!rows.length) return { header, rows };
  const h = [...header];
  let rs = rows.map((r) => [...r]);
  let changed = true;

  while (changed) {
    changed = false;
    const width = Math.max(h.length, ...rs.map((r) => r.length));
    if (width <= h.length) break;

    for (let j = 0; j < width; j++) {
      if (j < h.length) continue;
      const values = rs.map((r) => normCell(r[j])).filter(Boolean);
      const minSamples = rs.length < 3 ? rs.length : Math.max(3, Math.floor(rs.length * 0.45));
      if (values.length < minSamples) continue;
      const uniq = new Set(values);
      if (uniq.size !== 1) continue;

      rs = rs.map((r) => [...r.slice(0, j), ...r.slice(j + 1)]);
      changed = true;
      break;
    }
  }

  return { header: h, rows: rs };
}

function trimToHeaderWidth(header: string[], rows: string[][]): string[][] {
  const end = Math.max(lastNonEmptyIndex(header), 0);
  const width = end + 1;
  return rows.map((row) => {
    const next = row.slice(0, width);
    while (next.length < width) next.push("");
    return next;
  });
}

/** RFC-style single-line CSV row (Google Sheets export). */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i += 1;
        continue;
      }
      q = !q;
      continue;
    }
    if (ch === "," && !q) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells.map((c) => normCell(c));
}

export function estimateCsvLineCount(csv: string): number {
  if (!csv) return 0;
  let count = 0;
  for (let i = 0; i < csv.length; i++) {
    if (csv.charCodeAt(i) === 10) count += 1;
  }
  if (!csv.endsWith("\n")) count += 1;
  return count;
}

export function shouldLazyParseSheetCsv(csv: string): boolean {
  return estimateCsvLineCount(csv) > SHEET_LAZY_PARSE_ROW_THRESHOLD || csv.length > 280_000;
}

function readCsvMatrix(csv: string, opts?: { maxLines?: number }): string[][] {
  return csvToMatrixLineParse(csv, opts?.maxLines);
}

function readCsvLineAt(csv: string, start: number): { line: string; next: number } {
  let i = start;
  let q = false;
  while (i < csv.length) {
    const ch = csv[i]!;
    if (ch === '"') {
      if (q && csv[i + 1] === '"') {
        i += 2;
        continue;
      }
      q = !q;
      i += 1;
      continue;
    }
    if (!q && ch === "\n") return { line: csv.slice(start, i), next: i + 1 };
    if (!q && ch === "\r") {
      const next = csv[i + 1] === "\n" ? i + 2 : i + 1;
      return { line: csv.slice(start, i), next };
    }
    i += 1;
  }
  return { line: csv.slice(start), next: csv.length };
}

function csvToMatrixLineParse(csv: string, maxLines?: number): string[][] {
  const matrix: string[][] = [];
  let pos = 0;
  let lineNo = 0;
  while (pos < csv.length) {
    const { line, next } = readCsvLineAt(csv, pos);
    pos = next;
    if (line.trim() || lineNo < 6) matrix.push(parseCsvLine(line));
    lineNo += 1;
    if (maxLines != null && lineNo >= maxLines) break;
  }
  return padMatrixRows(matrix);
}

function buildGridFromMatrix(norm: string[][], headerRowIndex: number): SheetCsvParseResult {
  let header = mergeHeaderWithPreviousRow(norm, headerRowIndex);
  let rows = norm.slice(headerRowIndex + 1).filter((row) => row.some((c) => normCell(c)));

  ({ header, rows } = alignColumnStart(header, rows));
  ({ header, rows } = dropUniformSpacerColumns(header, rows));
  rows = trimToHeaderWidth(header, rows);
  header = header.map((v) => normCell(v) || "—");

  return { grid: { header, rows }, headerRowIndex };
}

export function csvToMatrix(csv: string): string[][] {
  return readCsvMatrix(csv);
}

/** First N lines only — header picker / quick scans without parsing the full workbook. */
export function readCsvMatrixHead(csv: string, maxLines: number): string[][] {
  return readCsvMatrix(csv, { maxLines });
}

export function parseCsvToGrid(
  csv: string,
  opts?: { headerRowIndex?: number; maxDataRows?: number },
): SheetCsvParseResult {
  if (opts?.maxDataRows != null) {
    const headerWindow = readCsvMatrix(csv, { maxLines: 45 });
    const headerRowIndex = resolveHeaderRowIndex(headerWindow, opts.headerRowIndex);
    const maxLines = headerRowIndex + 1 + opts.maxDataRows + 8;
    const norm = readCsvMatrix(csv, { maxLines });
    return buildGridFromMatrix(norm, headerRowIndex);
  }

  const norm = readCsvMatrix(csv);
  const headerRowIndex = resolveHeaderRowIndex(norm, opts?.headerRowIndex);
  return buildGridFromMatrix(norm, headerRowIndex);
}
