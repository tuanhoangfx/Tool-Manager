import { describe, expect, it } from "vitest";
import { shareAccessFromRow, shareFlagsFromAccess } from "./shareAccess";

describe("shareAccess", () => {
  it("maps row flags to access level", () => {
    expect(shareAccessFromRow({ share_enabled: false })).toBe("private");
    expect(shareAccessFromRow({ share_enabled: true, share_can_edit: false })).toBe("view");
    expect(shareAccessFromRow({ share_enabled: true, share_can_edit: true })).toBe("edit");
  });

  it("maps access level to db flags", () => {
    expect(shareFlagsFromAccess("private")).toEqual({ share_enabled: false, share_can_edit: false });
    expect(shareFlagsFromAccess("view")).toEqual({ share_enabled: true, share_can_edit: false });
    expect(shareFlagsFromAccess("edit")).toEqual({ share_enabled: true, share_can_edit: true });
  });
});
