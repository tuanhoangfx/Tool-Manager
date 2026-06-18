import { describe, expect, it } from "vitest";
import { buildHighlightSegments, getTaskSearchHighlight } from "./taskSearchHighlight";

describe("getTaskSearchHighlight", () => {
  it("splits numeric-only search to id terms", () => {
    expect(getTaskSearchHighlight("00")).toEqual({ idTerms: ["00"], titleTerms: [] });
  });

  it("splits mixed search to id digits and title letters", () => {
    expect(getTaskSearchHighlight("00a")).toEqual({ idTerms: ["00"], titleTerms: ["a"] });
  });

  it("uses title terms for text-only search", () => {
    expect(getTaskSearchHighlight("alpha")).toEqual({ idTerms: [], titleTerms: ["alpha"] });
  });
});

describe("buildHighlightSegments", () => {
  it("highlights partial id match", () => {
    expect(buildHighlightSegments("0083", ["00"])).toEqual([
      { text: "00", highlight: true },
      { text: "83", highlight: false },
    ]);
  });

  it("highlights case-insensitive title match", () => {
    expect(buildHighlightSegments("A1", ["a"])).toEqual([
      { text: "A", highlight: true },
      { text: "1", highlight: false },
    ]);
  });
});
