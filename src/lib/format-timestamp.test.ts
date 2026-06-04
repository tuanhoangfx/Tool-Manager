import { describe, expect, it } from "vitest";
import { formatTimestampCompact, formatTimestampCompactOrDash } from "./format-timestamp";

describe("formatTimestampCompact", () => {
  it("formats local time as hh:mm dd/mm/yy", () => {
    const d = new Date(2026, 5, 3, 18, 30, 0);
    expect(formatTimestampCompact(d.toISOString())).toMatch(/^18:30 03\/06\/26$/);
  });

  it("returns empty for missing input", () => {
    expect(formatTimestampCompact(null)).toBe("");
    expect(formatTimestampCompactOrDash(undefined)).toBe("—");
  });
});
