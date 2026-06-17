import { describe, expect, it } from "vitest";
import { parseGoogleSheetLink, toGoogleSheetCsvUrl } from "./google-sheet-link";

const CZP_DOCS_URL =
  "https://docs.google.com/spreadsheets/d/1lbywBrXnQ1sw6IChfWPlS-sjKp-SJ7pNBtsPL4jCaoo/edit?gid=188963889#gid=188963889";

describe("parseGoogleSheetLink", () => {
  it("reads gid from query and hash", () => {
    const info = parseGoogleSheetLink(CZP_DOCS_URL);
    expect(info.kind).toBe("doc");
    expect(info.sheetId).toBe("1lbywBrXnQ1sw6IChfWPlS-sjKp-SJ7pNBtsPL4jCaoo");
    expect(info.gid).toBe("188963889");
  });
});

describe("toGoogleSheetCsvUrl", () => {
  it("builds gviz csv url for doc links", () => {
    const csv = toGoogleSheetCsvUrl(CZP_DOCS_URL);
    expect(csv.ok).toBe(true);
    if (csv.ok) {
      expect(csv.url).toContain("/gviz/tq?tqx=out:csv");
      expect(csv.url).toContain("gid=188963889");
    }
  });
});
