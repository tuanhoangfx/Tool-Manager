import { describe, expect, it } from "vitest";
import { normalizeGranteeEmail } from "./normalizeGranteeEmail";

describe("normalizeGranteeEmail", () => {
  it("maps Hub User ID to infix1 synthetic email", () => {
    expect(normalizeGranteeEmail("CS00761")).toBe("cs00761@infix1.io.vn");
  });

  it("keeps real emails lowercase", () => {
    expect(normalizeGranteeEmail("User@Corp.COM")).toBe("user@corp.com");
  });
});
