import { describe, expect, it } from "vitest";
import { filterLegacyPurgedSheetSources, isLegacyPurgedSheetSource } from "./sheet-legacy-purge";

describe("sheet-legacy-purge", () => {
  it("flags CzP Seller buyer and order list dedupe keys", () => {
    expect(
      isLegacyPurgedSheetSource({
        rawUrl: "https://docs.google.com/spreadsheets/d/10cTORpWxfp9PfuZ95gbpBhiurIM0yOose4oU5QSC-mY/edit?gid=91093553",
        gid: "91093553",
        csvUrl: "https://docs.google.com/spreadsheets/d/10cTORpWxfp9PfuZ95gbpBhiurIM0yOose4oU5QSC-mY/export?format=csv&gid=91093553",
      }),
    ).toBe(true);
  });

  it("keeps unrelated sheets", () => {
    const kept = filterLegacyPurgedSheetSources([
      {
        rawUrl: "https://docs.google.com/spreadsheets/d/abc/edit#gid=1",
        gid: "1",
        csvUrl: "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=1",
      },
    ]);
    expect(kept).toHaveLength(1);
  });
});
