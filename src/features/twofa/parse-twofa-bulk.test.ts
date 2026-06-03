import { describe, expect, it } from "vitest";
import {
  formatTwofaBulkLine,
  parseTwofaBulkLine,
  parseTwofaBulkText,
  validateTwofaBulkRows,
} from "./parse-twofa-bulk";

describe("parseTwofaBulkLine", () => {
  it("parses Platform|ID|2FA (3 fields)", () => {
    const row = parseTwofaBulkLine(["Google", "user@gmail.com", "JBSWY3DPEHPK3PXP"]);
    expect(row).toEqual({
      service: "Google",
      account: "user@gmail.com",
      password: "",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });

  it("parses Platform|ID|Pass|2FA (4 fields)", () => {
    const row = parseTwofaBulkLine(["GitHub", "dev", "mypass", "JBSWY3DPEHPK3PXP"]);
    expect(row).toEqual({
      service: "GitHub",
      account: "dev",
      password: "mypass",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });
});

describe("parseTwofaBulkText", () => {
  it("parses Platform|ID|2FA lines and skips header", () => {
    const text = `Platform|ID|2FA
Google|user@gmail.com|JBSWY3DPEHPK3PXP`;
    const { rows, errors } = parseTwofaBulkText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.service).toBe("Google");
    expect(rows[0]?.account).toBe("user@gmail.com");
    expect(rows[0]?.password).toBeUndefined();
  });

  it("parses Platform|ID|Pass|2FA and skips 4-field header", () => {
    const text = `Platform|ID|Pass|2FA
GitHub|dev|secret123|JBSWY3DPEHPK3PXP`;
    const { rows, errors } = parseTwofaBulkText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.password).toBe("secret123");
    expect(rows[0]?.secret).toBe("JBSWY3DPEHPK3PXP");
  });

  it("reports invalid lines", () => {
    const { errors } = parseTwofaBulkText("only|two");
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("formatTwofaBulkLine", () => {
  it("omits pass segment when empty", () => {
    expect(
      formatTwofaBulkLine({ service: "A", account: "b", secret: "SEC" }),
    ).toBe("A|b|SEC");
  });

  it("includes pass segment when set", () => {
    expect(
      formatTwofaBulkLine({ service: "A", account: "b", password: "p", secret: "SEC" }),
    ).toBe("A|b|p|SEC");
  });
});

describe("validateTwofaBulkRows", () => {
  it("accepts valid base32", () => {
    const { valid, invalid } = validateTwofaBulkRows([
      { line: 2, service: "GitHub", account: "dev", secret: "JBSWY3DPEHPK3PXP" },
    ]);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });

  it("keeps password on valid rows", () => {
    const { valid } = validateTwofaBulkRows([
      {
        line: 2,
        service: "GitHub",
        account: "dev",
        password: "pw",
        secret: "JBSWY3DPEHPK3PXP",
      },
    ]);
    expect(valid[0]?.password).toBe("pw");
  });
});
