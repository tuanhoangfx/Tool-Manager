import { describe, expect, it } from "vitest";
import { diffSideBySideWithWords } from "./noteVersionLineDiff";
import { countDiffStats, countWordDiffStats } from "./noteHistoryDiffUi";

describe("countWordDiffStats", () => {
  it("counts word-level changes in modified lines", () => {
    const rows = diffSideBySideWithWords("hello world", "hello there");
    expect(countDiffStats(rows)).toEqual({ added: 1, removed: 1 });
    expect(countWordDiffStats(rows)).toEqual({ wordsAdded: 1, wordsRemoved: 1 });
  });

  it("counts words in pure add/remove lines", () => {
    const rows = diffSideBySideWithWords("line one", "line one\nnew words here");
    expect(countWordDiffStats(rows)).toEqual({ wordsAdded: 3, wordsRemoved: 0 });
  });
});
