import { describe, expect, it } from "vitest";
import { resolveSheetColumnHintWidth, seedSheetGridColumnWidths } from "./sheet-grid-column-hints";

describe("sheet-grid-column-hints", () => {
  it("assigns wider width to answer and narrower to question", () => {
    expect(resolveSheetColumnHintWidth("❓ Question")).toBeLessThan(resolveSheetColumnHintWidth("🎯 Answer"));
  });

  it("seeds widths for every header index", () => {
    const header = ["Project", "Question", "Answer"];
    const widths = seedSheetGridColumnWidths(header);
    expect(widths["0"]).toBeGreaterThan(0);
    expect(widths["1"]).toBeLessThan(widths["2"]!);
  });
});
