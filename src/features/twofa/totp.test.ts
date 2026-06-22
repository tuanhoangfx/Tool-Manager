import { describe, expect, it } from "vitest";
import { generateCode, normalizeSecret, secondsRemaining } from "./totp";

describe("totp", () => {
  it("normalizes secret spacing", () => {
    expect(normalizeSecret("jbsw y3dp")).toBe("JBSWY3DP");
  });

  it("generates 6-digit code for known secret", () => {
    const code = generateCode("Test", "user@test.com", "JBSWY3DPEHPK3PXP");
    expect(code).toMatch(/^\d{6}$/);
  });

  it("returns null when secret is empty", () => {
    expect(generateCode("Test", "user@test.com", "")).toBeNull();
    expect(generateCode("Test", "user@test.com", "   ")).toBeNull();
  });

  it("seconds remaining is between 1 and 30", () => {
    const s = secondsRemaining();
    expect(s).toBeGreaterThanOrEqual(1);
    expect(s).toBeLessThanOrEqual(30);
  });
});
