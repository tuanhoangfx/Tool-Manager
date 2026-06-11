import { describe, expect, it } from "vitest";
import { resolveRouteStatusDot } from "./route-status-dot";

describe("resolveRouteStatusDot", () => {
  it("prefers locked browser over sync status", () => {
    const dot = resolveRouteStatusDot({ sourceLocked: true, syncStatus: "pending" });
    expect(dot.color).toBe("#22c55e");
  });

  it("marks pending sync as amber", () => {
    const dot = resolveRouteStatusDot({ sourceLocked: false, syncStatus: "pending" });
    expect(dot.color).toBe("#f59e0b");
  });

  it("marks synced routes as indigo", () => {
    const dot = resolveRouteStatusDot({ sourceLocked: false, syncStatus: "synced" });
    expect(dot.color).toBe("#818cf8");
  });
});
