import { describe, expect, it } from "vitest";
import { buildHeaderRowCandidates } from "./sheet-header-row-candidates";

describe("buildHeaderRowCandidates", () => {
  it("lists spacer sheet header rows for manual override", () => {
    const csv = [
      ",,,,,,,",
      ",🚀 Project,💠 Platform,🗂️ Category,❓ Question,🎯 Answer,⏱️ Processing Time,✍️ Note",
      ",,,,,,,",
      ",♾️ Infi 28,♾️ Infi 28,📚 Information,Cần tư vấn,cần tư vấn,,",
    ].join("\n");
    const candidates = buildHeaderRowCandidates(csv);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates.some((c) => /Project/i.test(c.preview))).toBe(true);
  });
});
