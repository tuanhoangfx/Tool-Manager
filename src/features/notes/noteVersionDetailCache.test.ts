import { describe, expect, it, beforeEach } from "vitest";
import {
  clearNoteVersionDetailCache,
  isSnapshotPartial,
  listItemToDetail,
  peekNoteVersion,
  prefetchAllNoteVersionsFromList,
  seedNoteVersionsFromList,
  versionNeedsFullBody,
} from "./noteVersionDetailCache";
import type { NoteVersionListItem } from "./noteVersionUtils";

const sample: NoteVersionListItem = {
  id: "v1",
  note_id: "n1",
  title: "T",
  body_preview: "hello",
  body_md: "hello world",
  body_truncated: false,
  body_length: 11,
  content_hash: "abc",
  source: "save",
  label: null,
  created_at: "2026-06-07T00:00:00Z",
};

describe("noteVersionDetailCache", () => {
  beforeEach(() => {
    clearNoteVersionDetailCache();
  });

  it("seeds and peeks full list bodies synchronously", () => {
    seedNoteVersionsFromList([sample]);
    expect(peekNoteVersion("v1")).toEqual(listItemToDetail(sample));
  });

  it("marks truncated list rows as needing full fetch", () => {
    expect(versionNeedsFullBody({ ...sample, body_truncated: true })).toBe(true);
    expect(versionNeedsFullBody(sample)).toBe(false);
  });

  it("prefetchAll seeds full list bodies synchronously", () => {
    prefetchAllNoteVersionsFromList([sample]);
    expect(peekNoteVersion("v1")).toEqual(listItemToDetail(sample));
  });

  it("detects partial compare when full body not loaded", () => {
    const truncated = { ...sample, body_truncated: true, body_length: 100_000, body_md: "x".repeat(100) };
    expect(isSnapshotPartial(truncated, null)).toBe(true);
    expect(isSnapshotPartial(sample, listItemToDetail(sample)!)).toBe(false);
  });
});
