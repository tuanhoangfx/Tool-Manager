import { describe, expect, it } from "vitest";
import { peekSheetGridFromCaches } from "./sheet-grid-cache";
import type { SheetGridData } from "./sheet-grid-types";

const grid: SheetGridData = {
  header: ["A", "B"],
  rows: [["1", "2"]],
};

describe("peekSheetGridFromCaches", () => {
  it("reads from in-memory map when present", () => {
    const memory = new Map<string, SheetGridData>([
      ["mem", { header: ["M"], rows: [] }],
      ["sheet-a", grid],
    ]);
    expect(peekSheetGridFromCaches("mem", memory)?.header).toEqual(["M"]);
    expect(peekSheetGridFromCaches("sheet-a", memory)?.header).toEqual(["A", "B"]);
    expect(peekSheetGridFromCaches("missing", memory)).toBeNull();
  });
});
