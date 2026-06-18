import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import type { SheetGridData } from "./sheet-grid-types";

function normHeader(label: string): string {
  return String(label ?? "")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .toLowerCase();
}

function findColumnIndex(header: string[], pattern: RegExp): number {
  return header.findIndex((h) => pattern.test(normHeader(h)));
}

function uniqueColumnValues(rows: string[][], colIndex: number, limit = 24): string[] {
  if (colIndex < 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const v = String(row[colIndex] ?? "").trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function pushFilter(
  defs: FilterDef[],
  key: string,
  label: string,
  colIndex: number,
  rows: string[][],
  limit = 24,
  minOptions = 1,
) {
  if (colIndex < 0) return;
  const options = uniqueColumnValues(rows, colIndex, limit);
  if (options.length < minOptions) return;
  defs.push({
    key,
    label,
    options: options.map((value) => ({ value, label: value })),
  });
}

export function buildSheetMainFilterDefs(grid: SheetGridData | null): FilterDef[] {
  if (!grid || grid.rows.length === 0) return [];
  const projectIdx = findColumnIndex(grid.header, /^project$/);
  const platformIdx = findColumnIndex(grid.header, /^platform$/);
  const categoryIdx = findColumnIndex(grid.header, /^category$/);
  const questionIdx = findColumnIndex(grid.header, /^question$/);
  const answerIdx = findColumnIndex(grid.header, /^answer$/);
  const defs: FilterDef[] = [];

  pushFilter(defs, "project", "Project", projectIdx, grid.rows);
  pushFilter(defs, "platform", "Platform", platformIdx, grid.rows);
  pushFilter(defs, "category", "Category", categoryIdx, grid.rows);

  const questions = uniqueColumnValues(grid.rows, questionIdx, 16);
  if (questionIdx >= 0 && questions.length > 1) {
    defs.push({
      key: "question",
      label: "Question",
      options: questions.map((value) => ({ value, label: value })),
    });
  }

  const answers = uniqueColumnValues(grid.rows, answerIdx, 16);
  if (answerIdx >= 0 && answers.length > 1) {
    defs.push({
      key: "answer",
      label: "Answer",
      options: answers.map((value) => ({ value, label: value })),
    });
  }

  return defs;
}

export function applySheetMainFilters(
  rows: string[][],
  header: string[],
  values: FilterValues,
): string[][] {
  const projectIdx = findColumnIndex(header, /^project$/);
  const platformIdx = findColumnIndex(header, /^platform$/);
  const categoryIdx = findColumnIndex(header, /^category$/);
  const questionIdx = findColumnIndex(header, /^question$/);
  const answerIdx = findColumnIndex(header, /^answer$/);
  const projectSel = new Set((values.project as string[] | undefined) ?? []);
  const platformSel = new Set((values.platform as string[] | undefined) ?? []);
  const categorySel = new Set((values.category as string[] | undefined) ?? []);
  const questionSel = new Set((values.question as string[] | undefined) ?? []);
  const answerSel = new Set((values.answer as string[] | undefined) ?? []);

  return rows.filter((row) => {
    if (projectSel.size > 0 && projectIdx >= 0) {
      if (!projectSel.has(String(row[projectIdx] ?? "").trim())) return false;
    }
    if (platformSel.size > 0 && platformIdx >= 0) {
      if (!platformSel.has(String(row[platformIdx] ?? "").trim())) return false;
    }
    if (categorySel.size > 0 && categoryIdx >= 0) {
      if (!categorySel.has(String(row[categoryIdx] ?? "").trim())) return false;
    }
    if (questionSel.size > 0 && questionIdx >= 0) {
      if (!questionSel.has(String(row[questionIdx] ?? "").trim())) return false;
    }
    if (answerSel.size > 0 && answerIdx >= 0) {
      if (!answerSel.has(String(row[answerIdx] ?? "").trim())) return false;
    }
    return true;
  });
}
