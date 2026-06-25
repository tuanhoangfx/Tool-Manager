import { describe, expect, it } from "vitest";
import {
  buildTwofaVaultUrl,
  parseTwofaVaultRoute,
} from "./twofa-vault-path";

describe("twofa-vault-path", () => {
  it("parses canonical sub-routes", () => {
    expect(parseTwofaVaultRoute("/twofa/services").view).toBe("services");
    expect(parseTwofaVaultRoute("/twofa/mail").view).toBe("mail");
    expect(parseTwofaVaultRoute("/twofa").view).toBe("services");
  });

  it("builds sub-route URLs", () => {
    expect(buildTwofaVaultUrl("mail")).toBe("/twofa/mail");
    expect(buildTwofaVaultUrl("services", "?afilt=1")).toBe("/twofa/services?afilt=1");
  });

  it("canonical default sub-route is services", () => {
    expect(parseTwofaVaultRoute("/twofa").view).toBe("services");
    expect(buildTwofaVaultUrl("services", "?afilt=1")).toBe("/twofa/services?afilt=1");
  });
});
