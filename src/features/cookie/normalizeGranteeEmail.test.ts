import { describe, expect, it } from "vitest";
import {
  displayGranteeUser,
  formatGranteeSharePreview,
  granteeLookupEmails,
  normalizeGranteeEmail,
} from "./grantee-display";

describe("normalizeGranteeEmail", () => {
  it("maps Hub User ID to infix1 synthetic email", () => {
    expect(normalizeGranteeEmail("CS00761")).toBe("cs00761@infix1.io.vn");
  });

  it("keeps real emails lowercase", () => {
    expect(normalizeGranteeEmail("User@Corp.COM")).toBe("user@corp.com");
  });
});

describe("granteeLookupEmails", () => {
  it("returns primary and legacy synthetic emails for User ID", () => {
    expect(granteeLookupEmails("CS00642")).toEqual([
      "cs00642@infix1.io.vn",
      "cs00642@id.hub.x1z10.local",
    ]);
  });
});

describe("displayGranteeUser", () => {
  it("shows User ID for synthetic grantee email", () => {
    expect(displayGranteeUser({ grantee_email: "cs00642@infix1.io.vn" })).toBe("CS00642");
  });
});

describe("formatGranteeSharePreview", () => {
  it("previews User ID resolution", () => {
    expect(formatGranteeSharePreview("CS00642")).toBe("CS00642 → cs00642@infix1.io.vn");
  });
});
