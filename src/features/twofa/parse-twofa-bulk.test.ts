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
      browser: undefined,
      service: "Google",
      account: "user@gmail.com",
      password: "",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });

  it("parses secret-only line (1 field)", () => {
    expect(parseTwofaBulkLine(["JBSWY3DPEHPK3PXP"])).toEqual({
      browser: undefined,
      service: "",
      account: "",
      password: "",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });

  it("parses Platform|2FA without account (2 fields)", () => {
    expect(parseTwofaBulkLine(["Google", "JBSWY3DPEHPK3PXP"])).toEqual({
      browser: undefined,
      service: "Google",
      account: "",
      password: "",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });

  it("parses Platform|ID|Pass|2FA (4 fields)", () => {
    const row = parseTwofaBulkLine(["GitHub", "dev", "mypass", "JBSWY3DPEHPK3PXP"]);
    expect(row).toEqual({
      browser: undefined,
      service: "GitHub",
      account: "dev",
      password: "mypass",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });

  it("parses Browser|Platform|ID|2FA (4 fields with browser prefix)", () => {
    const row = parseTwofaBulkLine(["0100", "Google", "user@gmail.com", "JBSWY3DPEHPK3PXP"]);
    expect(row).toEqual({
      browser: "0100",
      service: "Google",
      account: "user@gmail.com",
      password: "",
      secret: "JBSWY3DPEHPK3PXP",
    });
  });

  it("parses Browser|Platform|ID|Pass|2FA (5 fields)", () => {
    const row = parseTwofaBulkLine(["0101", "GitHub", "dev", "mypass", "JBSWY3DPEHPK3PXP"]);
    expect(row).toEqual({
      browser: "0101",
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

  it("parses mixed legacy and browser-prefixed rows", () => {
    const text = `Google|user@gmail.com|JBSWY3DPEHPK3PXP
0100|Facebook|fb-user|mypass|JBSWY3DPEHPK3PXP`;
    const { rows, errors } = parseTwofaBulkText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.browser).toBeUndefined();
    expect(rows[1]?.browser).toBe("0100");
    expect(rows[1]?.password).toBe("mypass");
  });

  it("skips browser-prefixed header row", () => {
    const text = `Browser|Platform|ID|Pass|2FA
0101|GitHub|dev|pw|JBSWY3DPEHPK3PXP`;
    const { rows, errors } = parseTwofaBulkText(text);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.browser).toBe("0101");
  });

  it("accepts secret-only line without separators", () => {
    const { rows, errors } = parseTwofaBulkText("JBSWY3DPEHPK3PXP");
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.secret).toBe("JBSWY3DPEHPK3PXP");
  });

  it("reports lines missing secret", () => {
    const { errors } = parseTwofaBulkText("Google||");
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

  it("prefixes browser code when set", () => {
    expect(
      formatTwofaBulkLine({ service: "A", account: "b", browser: "0100", secret: "SEC" }),
    ).toBe("0100|A|b|SEC");
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

  it("accepts rows with empty platform and account", () => {
    const { valid, invalid } = validateTwofaBulkRows([
      { line: 1, service: "", account: "", secret: "JBSWY3DPEHPK3PXP" },
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

  it("rejects invalid browser code", () => {
    const { valid, invalid } = validateTwofaBulkRows([
      {
        line: 2,
        service: "GitHub",
        browser: "chrome",
        account: "dev",
        secret: "JBSWY3DPEHPK3PXP",
      },
    ]);
    expect(valid).toHaveLength(0);
    expect(invalid[0]?.message).toMatch(/4 digits/);
  });

  it("keeps browser on valid rows", () => {
    const { valid } = validateTwofaBulkRows([
      {
        line: 2,
        service: "GitHub",
        browser: "0100",
        account: "dev",
        secret: "JBSWY3DPEHPK3PXP",
      },
    ]);
    expect(valid[0]?.browser).toBe("0100");
  });
});
