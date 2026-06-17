import { describe, expect, it } from "vitest";
import {
  alignColumnStart,
  detectHeaderRowIndex,
  dropUniformSpacerColumns,
  normalizeDocumentTaxonomyColumn,
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
  it("removes uniform spacer column when data is wider than header", () => {
    const header = ["Platform", "Category", "Question", "Answer"];
    const rows = [
      ["Infi 28", "Information", "Cần tư vấn", "cần tư vấn về thanh toán"],
      ["Infi 28", "Information", "Xác nhận ok", "ok em"],
      ["Infi 28", "Information", "Đã nhận thanh toán", "đã nhận"],
    ];
    const { header: h, rows: rs } = dropUniformSpacerColumns(header, rows);
    expect(h).toEqual(header);
    expect(rs[0]).toEqual(["Infi 28", "Cần tư vấn", "cần tư vấn về thanh toán"]);
    expect(rs[1]?.[1]).toBe("Xác nhận ok");
  });
});

describe("normalizeDocumentTaxonomyColumn", () => {
  it("drops document taxonomy and keeps Question column", () => {
    const header = ["💠 Platform", "🗂️ Category", "❓ Question", "🎯 Answer"];
    const rows = [
      ["Infi 28", "📚 Information", "Cần tư vấn", "cần tư vấn về thanh toán"],
      ["Infi 28", "❓ Q&A", "Xác nhận ok", "ok em"],
    ];
    const { header: h, rows: rs } = normalizeDocumentTaxonomyColumn(header, rows);
    expect(h).toHaveLength(3);
    expect(h[1]).toMatch(/Question/i);
    expect(rs[0]).toEqual(["Infi 28", "Cần tư vấn", "cần tư vấn về thanh toán"]);
    expect(rs[1]?.[1]).toBe("Xác nhận ok");
  });
});

describe("parseCsvToGrid", () => {
  it("aligns Infi Docs Q&A rows after uniform spacer column", () => {
    const csv = [
      '"💠 Platform","🗂️ Category","❓ Question","🎯 Answer"',
      '"Infi 28","📚 Information","Cần tư vấn","cần tư vấn về thanh toán"',
      '"Infi 28","❓ Q&A","Xác nhận ok","ok em"',
    ].join("\n");
    const { grid } = parseCsvToGrid(csv);
    expect(grid.header[0]).toContain("Platform");
    expect(grid.header[1]).toMatch(/Question/i);
    expect(grid.rows[0]?.[0]).toBe("Infi 28");
    expect(grid.rows[0]?.[1]).toBe("Cần tư vấn");
    expect(grid.rows[0]?.[2]).toContain("cần tư vấn");
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
