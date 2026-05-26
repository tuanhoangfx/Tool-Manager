import { describe, expect, it } from "vitest";
import { getCookieSourceLockState } from "./cookieSourceLock";

describe("getCookieSourceLockState", () => {
  it("requires an explicit source browser", () => {
    expect(getCookieSourceLockState(null, "browser-a")).toEqual({
      canWrite: false,
      state: "source_unset",
    });
  });

  it("marks non-source browsers as read-only", () => {
    expect(getCookieSourceLockState("browser-a", "browser-b")).toEqual({
      canWrite: false,
      state: "read_only",
    });
  });

  it("allows the locked source browser to write", () => {
    expect(getCookieSourceLockState("browser-a", "browser-a")).toEqual({
      canWrite: true,
      state: "source",
    });
  });
});
