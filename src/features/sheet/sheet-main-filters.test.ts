import { describe, expect, it } from "vitest";
import { applySheetMainFilters, buildSheetMainFilterDefs } from "./sheet-main-filters";

const GRID = {
  header: ["🚀 Project", "💠 Platform", "🗂️ Category", "❓ Question", "🎯 Answer"],
  rows: [
    ["Infi 28", "Infi 28", "📚 Information", "Cần tư vấn", "cần tư vấn"],
    ["Infi 28", "Infi 28", "📚 Information", "Xác nhận ok", "ok em"],
  ],
};

describe("buildSheetMainFilterDefs", () => {
  it("includes project, platform, and category when columns exist", () => {
    const defs = buildSheetMainFilterDefs(GRID);
    const keys = defs.map((d) => d.key);
    expect(keys).toContain("project");
    expect(keys).toContain("platform");
    expect(keys).toContain("category");
  });

  it("includes category even with a single unique value", () => {
    const defs = buildSheetMainFilterDefs(GRID);
    const category = defs.find((d) => d.key === "category");
    expect(category?.options).toHaveLength(1);
    expect(category?.options?.[0]?.value).toContain("Information");
  });
});

describe("applySheetMainFilters", () => {
  it("filters rows by category selection", () => {
    const rows = applySheetMainFilters(GRID.rows, GRID.header, {
      category: ["📚 Information"],
      question: ["Cần tư vấn"],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.[3]).toBe("Cần tư vấn");
  });
});
