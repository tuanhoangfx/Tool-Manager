import { describe, expect, it, vi } from "vitest";
import { fmtHubRelativeTime } from "./twofa-time";

describe("twofa-time", () => {
  it("formats relative age via hub-ui SSOT", () => {
    const now = Date.parse("2026-06-19T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    expect(fmtHubRelativeTime("2026-06-19T11:59:30.000Z", now)).toBe("just now");
    expect(fmtHubRelativeTime("2026-06-19T11:54:00.000Z", now)).toBe("6m ago");
    expect(fmtHubRelativeTime("2026-06-19T06:00:00.000Z", now)).toBe("6h ago");

    vi.useRealTimers();
  });
});
