import { describe, expect, it } from "vitest";
import { resolveRouteSyncedDisplayIso } from "./route-sync-display";

describe("resolveRouteSyncedDisplayIso", () => {
  it("uses only notes.synced_at (manual extension sync)", () => {
    expect(
      resolveRouteSyncedDisplayIso({
        noteSyncedAt: "2026-06-04T14:57:00.000Z",
      }),
    ).toBe("2026-06-04T14:57:00.000Z");
  });

  it("ignores vault — no note sync time", () => {
    expect(resolveRouteSyncedDisplayIso({ noteSyncedAt: null })).toBe(null);
    expect(resolveRouteSyncedDisplayIso({ noteSyncedAt: "" })).toBe(null);
  });
});
