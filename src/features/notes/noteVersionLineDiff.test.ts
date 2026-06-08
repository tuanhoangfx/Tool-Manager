import { describe, expect, it } from "vitest";
import { diffSideBySide, diffSideBySideWithWords, diffWordSegments } from "./noteVersionLineDiff";

describe("diffSideBySide", () => {
  it("marks added lines on the left", () => {
    const rows = diffSideBySide("a", "a\nb");
    expect(rows).toEqual([
      { left: "a", right: "a", leftTone: "neutral", rightTone: "neutral" },
      { left: "b", right: null, leftTone: "add", rightTone: "neutral" },
    ]);
  });

  it("marks removed lines on the right", () => {
    const rows = diffSideBySide("a\nb", "a");
    expect(rows).toEqual([
      { left: "a", right: "a", leftTone: "neutral", rightTone: "neutral" },
      { left: null, right: "b", leftTone: "neutral", rightTone: "remove" },
    ]);
  });

  it("handles empty strings", () => {
    expect(diffSideBySide("", "")).toEqual([
      { left: "", right: "", leftTone: "neutral", rightTone: "neutral" },
    ]);
  });
});

describe("diffWordSegments", () => {
  it("highlights changed words within a line", () => {
    const { oldSegments, newSegments } = diffWordSegments("hello world", "hello there");
    expect(oldSegments.filter((s) => s.type === "remove").map((s) => s.text).join("")).toBe("world");
    expect(newSegments.filter((s) => s.type === "add").map((s) => s.text).join("")).toBe("there");
    expect(oldSegments.filter((s) => s.type === "same").map((s) => s.text).join("")).toContain("hello");
  });
});

describe("diffSideBySideWithWords", () => {
  it("merges paired remove+add lines with word segments", () => {
    const rows = diffSideBySideWithWords("hello world", "hello there");
    expect(rows).toHaveLength(1);
    expect(rows[0].leftTone).toBe("add");
    expect(rows[0].rightTone).toBe("remove");
    expect(rows[0].leftWords?.some((s) => s.type === "add" && s.text === "there")).toBe(true);
    expect(rows[0].rightWords?.some((s) => s.type === "remove" && s.text === "world")).toBe(true);
  });

  it("tags pure add lines with all-add word segments", () => {
    const rows = diffSideBySideWithWords("a", "a\nnew line");
    const added = rows.find((r) => r.leftTone === "add");
    expect(added?.leftWords?.every((s) => s.type === "add")).toBe(true);
  });
});
