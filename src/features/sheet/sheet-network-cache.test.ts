import { describe, expect, it } from "vitest";
import { isSheetNetworkCacheFresh, SHEET_NETWORK_FETCH_TTL_MS } from "./sheet-network-cache";

describe("isSheetNetworkCacheFresh", () => {
  const now = Date.parse("2026-06-30T12:00:00.000Z");

  it("returns true inside TTL window", () => {
    expect(
      isSheetNetworkCacheFresh(
        { lastSyncedAt: new Date(now - SHEET_NETWORK_FETCH_TTL_MS + 60_000).toISOString() },
        now,
      ),
    ).toBe(true);
  });

  it("returns false when stale", () => {
    expect(
      isSheetNetworkCacheFresh(
        { lastSyncedAt: new Date(now - SHEET_NETWORK_FETCH_TTL_MS - 1).toISOString() },
        now,
      ),
    ).toBe(false);
  });
});
