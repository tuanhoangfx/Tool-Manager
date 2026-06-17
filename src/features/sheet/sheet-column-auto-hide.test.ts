import { describe, expect, it } from "vitest";
import { computeAutoHiddenColumnIndices } from "./sheet-column-auto-hide";

describe("computeAutoHiddenColumnIndices", () => {
  it("shows all columns when every column has label or data", () => {
    expect(computeAutoHiddenColumnIndices(["A", "B", "C"], [["1", "2", "3"]])).toEqual([]);
  });

  it("hides only unnamed columns with no data", () => {
    const header = ["Category", "Platform", "Empty1", "Hyperlink", "Empty2", "Feature", "Note", "Extra"];
    const rows = [
      ["Web", "Infi", "", "https://x", "", "Docs", "n1", ""],
      ["Web", "Infi", "", "https://y", "", "Docs", "n2", ""],
    ];
    expect(computeAutoHiddenColumnIndices(header, rows)).toEqual([]);
  });

  it("hides blank header columns with no data", () => {
    const header = ["Category", "Platform", "", "Hyperlink", "", "Feature"];
    const rows = [["Web", "Infi", "", "https://x", "", "Docs"]];
    expect(computeAutoHiddenColumnIndices(header, rows)).toEqual([2, 4]);
  });

  it("keeps all columns when every column has data", () => {
    const header = Array.from({ length: 10 }, (_, i) => `Col${i}`);
    const rows = [header.map((_, i) => `v${i}`)];
    const hidden = computeAutoHiddenColumnIndices(header, rows);
    expect(hidden).toEqual([]);
  });
});
