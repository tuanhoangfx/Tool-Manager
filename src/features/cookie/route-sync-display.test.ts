import { describe, expect, it } from "vitest";
import { resolveRouteSyncedDisplayIso, resolveRouteSyncDisplay } from "./route-sync-display";

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

describe("resolveRouteSyncDisplay", () => {
  it("shows Synced when vault has cookies despite pending status", () => {
    const display = resolveRouteSyncDisplay({
      syncStatus: "pending",
      noteSyncedAt: "2026-06-04T14:57:00.000Z",
      vaultCookieCount: 32,
    });
    expect(display.label).toBe("Synced");
    expect(display.tone).toBe("ok");
    expect(display.filterStatus).toBe("pending");
  });

  it("shows Awaiting sync when no vault and no sync time", () => {
    const display = resolveRouteSyncDisplay({ syncStatus: "pending" });
    expect(display.label).toBe("Awaiting sync");
    expect(display.tone).toBe("warn");
  });
});
