import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSheetPendingDelete,
  filterSheetPendingDeletes,
  getSheetPendingDeleteIds,
  markSheetPendingDelete,
  resetSheetPendingDeletesForTests,
} from "./sheet-sync-pending";
import type { SheetSource } from "./sheet-sources";

function src(partial: Partial<SheetSource> & Pick<SheetSource, "id">): SheetSource {
  return {
    title: "Sheet",
    rawUrl: "https://docs.google.com/spreadsheets/d/abc/edit#gid=1",
    csvUrl: "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=1",
    gid: "1",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

describe("sheet-sync-pending", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSheetPendingDeletesForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetSheetPendingDeletesForTests();
  });

  it("filters pending delete by id and dedupe key", () => {
    markSheetPendingDelete(
      src({
        id: "sh_local",
        rawUrl: "https://docs.google.com/spreadsheets/d/abc/edit#gid=1",
        csvUrl: "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=1",
        gid: "1",
      }),
    );
    const rows = filterSheetPendingDeletes([
      src({ id: "sh_local" }),
      src({
        id: "550e8400-e29b-41d4-a716-446655440000",
        rawUrl: "https://docs.google.com/spreadsheets/d/abc/edit#gid=1",
        csvUrl: "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=1",
        gid: "1",
      }),
      src({
        id: "sh_other",
        rawUrl: "https://docs.google.com/spreadsheets/d/xyz/edit#gid=2",
        csvUrl: "https://docs.google.com/spreadsheets/d/xyz/export?format=csv&gid=2",
        gid: "2",
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("sh_other");
    expect(getSheetPendingDeleteIds().has("sh_local")).toBe(true);
  });

  it("expires in-memory pending delete after mute window but keeps tombstone", () => {
    markSheetPendingDelete(src({ id: "a" }), 1000);
    vi.advanceTimersByTime(1001);
    expect(getSheetPendingDeleteIds().has("a")).toBe(false);
    expect(filterSheetPendingDeletes([src({ id: "a" })])).toHaveLength(0);
  });

  it("persists tombstone across reset of in-memory pending state", () => {
    const row = src({
      id: "a",
      rawUrl: "https://docs.google.com/spreadsheets/d/abc/edit#gid=1",
      csvUrl: "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=1",
      gid: "1",
    });
    markSheetPendingDelete(row, 1000);
    vi.advanceTimersByTime(1001);
    expect(filterSheetPendingDeletes([row])).toHaveLength(0);
    clearSheetPendingDelete(row);
    expect(filterSheetPendingDeletes([row])).toHaveLength(1);
  });
});
