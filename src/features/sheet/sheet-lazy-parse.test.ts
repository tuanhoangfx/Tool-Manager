import { describe, expect, it, vi } from "vitest";
import { estimateCsvLineCount, parseCsvToGrid, shouldLazyParseSheetCsv } from "./sheet-csv-grid";
import { runPhasedSheetCsvParse } from "./sheet-lazy-parse";

function makeCsv(rowCount: number): string {
  const lines = ["Name,Value", ...Array.from({ length: rowCount }, (_, i) => `Row ${i},${i}`)];
  return lines.join("\n");
}

describe("shouldLazyParseSheetCsv", () => {
  it("returns false for small sheets", () => {
    expect(shouldLazyParseSheetCsv(makeCsv(20))).toBe(false);
  });

  it("returns true for large sheets", () => {
    expect(shouldLazyParseSheetCsv(makeCsv(600))).toBe(true);
    expect(estimateCsvLineCount(makeCsv(600))).toBe(601);
  });
});

describe("parseCsvToGrid maxDataRows", () => {
  it("parses only the initial data row chunk", () => {
    const csv = makeCsv(900);
    const partial = parseCsvToGrid(csv, { maxDataRows: 200 });
    expect(partial.grid.rows.length).toBeLessThan(400);
    const full = parseCsvToGrid(csv);
    expect(full.grid.rows.length).toBe(900);
  });
});

describe("runPhasedSheetCsvParse", () => {
  it("delivers partial then full parse for large csv", async () => {
    vi.stubGlobal(
      "requestIdleCallback",
      (cb: IdleRequestCallback) => globalThis.setTimeout(() => cb({} as IdleDeadline), 0) as unknown as number,
    );
    vi.stubGlobal("cancelIdleCallback", (id: number) => globalThis.clearTimeout(id));

    const phases: number[] = [];
    await new Promise<void>((resolve) => {
      runPhasedSheetCsvParse(
        makeCsv(700),
        { isActive: () => true },
        (partial) => phases.push(partial.grid.rows.length),
        (full) => {
          phases.push(full.grid.rows.length);
          resolve();
        },
      );
    });

    expect(phases.length).toBe(2);
    expect(phases[0]).toBeLessThan(phases[1]!);
    vi.unstubAllGlobals();
  });
});
