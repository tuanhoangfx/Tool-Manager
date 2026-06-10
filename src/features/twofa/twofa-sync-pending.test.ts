import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearTwofaPendingDelete,
  filterTwofaPendingDeletes,
  getTwofaPendingDeleteIds,
  markTwofaPendingDelete,
} from "./twofa-sync-pending";

describe("twofa-sync-pending", () => {
  afterEach(() => {
    clearTwofaPendingDelete("a");
    clearTwofaPendingDelete("b");
    vi.useRealTimers();
  });

  it("filters in-flight delete ids from apply list", () => {
    markTwofaPendingDelete("a");
    const rows = filterTwofaPendingDeletes([
      { id: "a", service: "X", account: "1", secret: "S", createdAt: "", updatedAt: "" },
      { id: "b", service: "Y", account: "2", secret: "S", createdAt: "", updatedAt: "" },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["b"]);
    expect(getTwofaPendingDeleteIds().has("a")).toBe(true);
  });

  it("expires pending delete after mute window", () => {
    vi.useFakeTimers();
    markTwofaPendingDelete("a", 1000);
    vi.advanceTimersByTime(1001);
    expect(getTwofaPendingDeleteIds().has("a")).toBe(false);
  });
});
