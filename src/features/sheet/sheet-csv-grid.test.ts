import { describe, expect, it } from "vitest";
import {
  alignColumnStart,
  detectHeaderRowIndex,
  dropUniformSpacerColumns,
  padMatrixRows,
  parseCsvToGrid,
  resolveHeaderRowIndex,
} from "./sheet-csv-grid";

const CZP_DOCS_SAMPLE = `"r","","","","","","","","","","",""
"🔖 Category","📛 Platform","🔗 Hyperlink","🎯 Feature","","✂️ Short Link","","","","","",""
"🎨 Design","Lobehub","https://lobehub.com/vi-VN/icons","Download logo, icon","","","","","","","",""
"🚀 Performance","Claude","https://claude.ai/settings/billing","Check gói Claude Code","","","","","","","",""`;

describe("detectHeaderRowIndex", () => {
  it("skips lone spacer row before real headers", () => {
    const matrix = [
      ["r", "", ""],
      ["Category", "Platform", "Link"],
      ["Design", "Lobehub", "https://example.com"],
    ];
    expect(detectHeaderRowIndex(matrix)).toBe(1);
  });

  it("keeps row 0 when it already looks like a header", () => {
    const matrix = [
      ["Name", "Email", "Status"],
      ["Alice", "a@x.com", "active"],
    ];
    expect(detectHeaderRowIndex(matrix)).toBe(0);
  });
});

describe("resolveHeaderRowIndex", () => {
  it("reuses stored index when row still looks like a header", () => {
    const matrix = [
      ["r", "", ""],
      ["Category", "Platform", "Link"],
    ];
    expect(resolveHeaderRowIndex(matrix, 1)).toBe(1);
  });

  it("re-detects when stored index is no longer valid", () => {
    const matrix = [
      ["Name", "Email"],
      ["Alice", "a@x.com"],
    ];
    expect(resolveHeaderRowIndex(matrix, 5)).toBe(0);
  });
});

describe("padMatrixRows", () => {
  it("pads short rows to the widest row", () => {
    const matrix = [
      ["Platform", "Category", "Question"],
      ["Infi 28", "Information"],
    ];
    expect(padMatrixRows(matrix)).toEqual([
      ["Platform", "Category", "Question"],
      ["Infi 28", "Information", ""],
    ]);
  });
});

describe("dropUniformSpacerColumns", () => {
  it("keeps uniform Category column when header and data share the same width", () => {
    const header = ["Platform", "Category", "Question", "Answer"];
    const rows = [
      ["Infi 28", "Information", "Cần tư vấn", "cần tư vấn về thanh toán"],
      ["Infi 28", "Information", "Xác nhận ok", "ok em"],
      ["Infi 28", "Information", "Đã nhận thanh toán", "đã nhận"],
    ];
    const { header: h, rows: rs } = dropUniformSpacerColumns(header, rows);
    expect(h).toEqual(header);
    expect(rs).toEqual(rows);
  });

  it("removes uniform trailing spacer column when data is wider than header", () => {
    const header = ["Platform", "Question", "Answer"];
    const rows = [
      ["Infi 28", "Cần tư vấn", "cần tư vấn về thanh toán", "Information"],
      ["Infi 28", "Xác nhận ok", "ok em", "Information"],
    ];
    const { header: h, rows: rs } = dropUniformSpacerColumns(header, rows);
    expect(h).toEqual(header);
    expect(rs[0]).toEqual(["Infi 28", "Cần tư vấn", "cần tư vấn về thanh toán"]);
  });
});

describe("parseCsvToGrid", () => {
  it("keeps Category column for Infi Q&A tabs with uniform Information values", () => {
    const csv = [
      '"💠 Platform","🗂️ Category","❓ Question","🎯 Answer"',
      '"Infi 28","📚 Information","Cần tư vấn","cần tư vấn về thanh toán"',
      '"Infi 28","❓ Q&A","Xác nhận ok","ok em"',
    ].join("\n");
    const { grid } = parseCsvToGrid(csv);
    expect(grid.header[0]).toContain("Platform");
    expect(grid.header[1]).toMatch(/Category/i);
    expect(grid.header[2]).toMatch(/Question/i);
    expect(grid.rows[0]?.[0]).toBe("Infi 28");
    expect(grid.rows[0]?.[1]).toContain("Information");
    expect(grid.rows[0]?.[2]).toBe("Cần tư vấn");
  });

  it("parses Infi 28 Q&A sheet with leading empty column and spacer rows", () => {
    const csv = [
      ",,,,,,,",
      ",🚀 Project,💠 Platform,🗂️ Category,❓ Question,🎯 Answer,⏱️ Processing Time,✍️ Note",
      ",,,,,,,",
      ",♾️ Infi 28,♾️ Infi 28,📚 Information,Cần tư vấn,cần tư vấn về thanh toán,,",
    ].join("\n");
    const { grid, headerRowIndex } = parseCsvToGrid(csv);
    expect(headerRowIndex).toBe(1);
    expect(grid.header.some((h) => /Category/i.test(h))).toBe(true);
    expect(grid.header.some((h) => /Project/i.test(h))).toBe(true);
    expect(grid.rows[0]?.some((c) => /Information/i.test(c))).toBe(true);
    expect(grid.rows[0]?.some((c) => c === "Cần tư vấn")).toBe(true);
  });

  it("parses Czp Docs Web tab with spacer row", () => {
    const { grid, headerRowIndex } = parseCsvToGrid(CZP_DOCS_SAMPLE);
    expect(headerRowIndex).toBe(1);
    expect(grid.header[0]).toContain("Category");
    expect(grid.header[1]).toContain("Platform");
    expect(grid.rows.some((row) => row.some((cell) => /claude/i.test(cell)))).toBe(true);
  });

  it("honors persisted headerRowIndex", () => {
    const plain = `"Name","Email"\n"Alice","a@x.com"`;
    const { grid, headerRowIndex } = parseCsvToGrid(plain, { headerRowIndex: 0 });
    expect(headerRowIndex).toBe(0);
    expect(grid.header).toEqual(["Name", "Email"]);
    expect(grid.rows[0]).toEqual(["Alice", "a@x.com"]);
  });
});
