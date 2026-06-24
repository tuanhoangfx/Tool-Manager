import { describe, expect, it } from "vitest";
import { mergeQueuedSheetChanges } from "./useSheetSourcesCloud";
import type { SheetSourcesChangeDetail } from "./sheet-sources";

function change(detail: Partial<SheetSourcesChangeDetail> & Pick<SheetSourcesChangeDetail, "action" | "sourceId">): SheetSourcesChangeDetail {
  return {
    source: undefined,
    ...detail,
  };
}

describe("mergeQueuedSheetChanges", () => {
  it("replaces older queued change for the same source", () => {
    const queue = [
      change({ action: "upsert", sourceId: "a" }),
      change({ action: "delete", sourceId: "b" }),
    ];

    const next = mergeQueuedSheetChanges(queue, change({ action: "delete", sourceId: "a" }));

    expect(next).toEqual([
      change({ action: "delete", sourceId: "b" }),
      change({ action: "delete", sourceId: "a" }),
    ]);
  });

  it("keeps distinct sources in order", () => {
    const queue = [change({ action: "upsert", sourceId: "a" })];

    const next = mergeQueuedSheetChanges(queue, change({ action: "delete", sourceId: "b" }));

    expect(next).toEqual([
      change({ action: "upsert", sourceId: "a" }),
      change({ action: "delete", sourceId: "b" }),
    ]);
  });
});
