import { describe, expect, it } from "vitest";
import {
  normalizeTwofaAccountOwnership,
  parseOwnershipFromNote,
  parseOwnershipFromSheetLabel,
  stripOwnershipLineFromNote,
} from "./twofa-account-ownership";

describe("twofa-account-ownership", () => {
  it("maps sheet labels", () => {
    expect(parseOwnershipFromSheetLabel("🦸‍♂️ CzP")).toBe("czp");
    expect(parseOwnershipFromSheetLabel("🔋 Usable")).toBe("usable");
    expect(parseOwnershipFromSheetLabel("Buyer")).toBe("buyer");
  });

  it("parses ownership prefix from note", () => {
    expect(parseOwnershipFromNote("Ownership: 🔋 Usable\nMail: a@b.com")).toBe("usable");
  });

  it("strips ownership line from note", () => {
    expect(stripOwnershipLineFromNote("Ownership: 🔋 Usable\nMail: x")).toBe("Mail: x");
  });

  it("normalizes unknown to undefined", () => {
    expect(normalizeTwofaAccountOwnership("nope")).toBe("undefined");
  });
});
