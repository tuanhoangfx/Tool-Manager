import { afterEach, describe, expect, it, vi } from "vitest";
import type { TwofaAccount } from "./types";
import {
  applyTwofaPendingEdits,
  clearTwofaPendingDelete,
  clearTwofaPendingEdit,
  filterTwofaPendingDeletes,
  getTwofaPendingDeleteIds,
  markTwofaPendingDelete,
  markTwofaPendingEdit,
} from "./twofa-sync-pending";

function account(id: string, secret = "SECRET"): TwofaAccount {
  return {
    id,
    service: "Capcut",
    account: "user@test.com",
    secret,
    status: "active",
    ownership: "undefined",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-09T00:00:00.000Z",
  };
}

describe("twofa-sync-pending", () => {
  afterEach(() => {
    clearTwofaPendingDelete("a");
    clearTwofaPendingDelete("b");
    clearTwofaPendingEdit("known-1");
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

  it("overlays pending edit snapshot over stale cloud merge", () => {
    markTwofaPendingEdit({ ...account("known-1"), secret: "" });
    const merged = applyTwofaPendingEdits([account("known-1")]);
    expect(merged[0]?.secret).toBe("");
  });
});
