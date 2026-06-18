import { describe, expect, it } from "vitest";
import { SHEET_GRID_IDB_MAX_CSV_CHARS, trimSheetGridCsv } from "./sheet-grid-idb-cache";

describe("trimSheetGridCsv", () => {
  it("keeps csv under max size", () => {
    const csv = "a,b\n1,2";
    expect(trimSheetGridCsv(csv)).toBe(csv);
  });

  it("truncates oversized csv", () => {
    const csv = "x".repeat(SHEET_GRID_IDB_MAX_CSV_CHARS + 100);
    expect(trimSheetGridCsv(csv).length).toBe(SHEET_GRID_IDB_MAX_CSV_CHARS);
  });
});
