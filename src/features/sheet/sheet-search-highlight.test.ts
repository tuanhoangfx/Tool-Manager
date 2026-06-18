import { describe, expect, it } from "vitest";
import {
  findSheetSearchMatchRanges,
  foldSheetSearchText,
  sheetTextIncludesQuery,
} from "./sheet-search-fold";
import { countSheetSearchMatches, splitTextByQuery } from "./sheet-search-highlight";

describe("foldSheetSearchText", () => {
  it("strips Vietnamese diacritics and đ", () => {
    expect(foldSheetSearchText("Xác nhận đơn hàng")).toBe("xac nhan don hang");
  });
});

describe("sheetTextIncludesQuery", () => {
  it("matches without accents", () => {
    expect(sheetTextIncludesQuery("Cần xác nhận thanh toán", "xac nhan")).toBe(true);
  });

  it("matches partial accents in query", () => {
    expect(sheetTextIncludesQuery("Cần xác nhận thanh toán", "xác nhâ")).toBe(true);
  });

  it("matches mixed accents", () => {
    expect(sheetTextIncludesQuery("xác nhận", "xac nhan")).toBe(true);
    expect(sheetTextIncludesQuery("xác nhận", "xác nhan")).toBe(true);
  });
});

describe("splitTextByQuery", () => {
  it("returns single non-match when query empty", () => {
    expect(splitTextByQuery("hello", "")).toEqual([{ text: "hello", match: false }]);
  });

  it("highlights accent-insensitive match in original text", () => {
    expect(splitTextByQuery("Cần xác nhận thanh toán", "xac nhan")).toEqual([
      { text: "Cần ", match: false },
      { text: "xác nhận", match: true },
      { text: " thanh toán", match: false },
    ]);
  });

  it("highlights with partial accent query", () => {
    expect(splitTextByQuery("Cần xác nhận thanh toán", "xác nhâ")).toEqual([
      { text: "Cần ", match: false },
      { text: "xác nhậ", match: true },
      { text: "n thanh toán", match: false },
    ]);
  });

  it("splits case-insensitive matches with same accents", () => {
    expect(splitTextByQuery("Cần tư vấn thanh toán", "tư vấn")).toEqual([
      { text: "Cần ", match: false },
      { text: "tư vấn", match: true },
      { text: " thanh toán", match: false },
    ]);
  });

  it("marks whole-cell match", () => {
    expect(splitTextByQuery("pay", "pay")).toEqual([{ text: "pay", match: true }]);
  });

  it("matches literal parentheses in query", () => {
    expect(splitTextByQuery("a (test) b", "(test)")).toEqual([
      { text: "a ", match: false },
      { text: "(test)", match: true },
      { text: " b", match: false },
    ]);
  });
});

describe("findSheetSearchMatchRanges", () => {
  it("returns utf-16 slice ranges for folded needle", () => {
    expect(findSheetSearchMatchRanges("xác nhận", "xac nhan")).toEqual([{ start: 0, end: "xác nhận".length }]);
  });
});

describe("countSheetSearchMatches", () => {
  it("returns 0 when query empty", () => {
    expect(countSheetSearchMatches([["a", "b"]], "")).toBe(0);
  });

  it("counts occurrences across all cells with folding", () => {
    expect(
      countSheetSearchMatches(
        [
          ["xác nhận xác nhận", "x"],
          ["y", "Thanh toán xac nhan"],
        ],
        "xac nhan",
      ),
    ).toBe(3);
  });
});
