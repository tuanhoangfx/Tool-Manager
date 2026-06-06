import { describe, expect, it } from "vitest";
import { buildTwofaChartItems, twofaAccountIdentityBucket } from "./twofa-aggregates";
import type { TwofaAccount } from "./types";

function account(partial: Partial<TwofaAccount> & Pick<TwofaAccount, "service">): TwofaAccount {
  return {
    id: partial.id ?? "1",
    service: partial.service,
    account: partial.account ?? "user@example.com",
    secret: partial.secret ?? "ABCDEFGHIJKLMNOP",
    createdAt: partial.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
    password: partial.password,
    lastUsedAt: partial.lastUsedAt,
  };
}

describe("buildTwofaChartItems", () => {
  it("attaches brand iconSrc for known services", () => {
    const charts = buildTwofaChartItems([account({ service: "Gmail" }), account({ service: "ChatGPT" })]);
    const gmail = charts.serviceItems.find((item) => item.label === "Gmail");
    const chatgpt = charts.serviceItems.find((item) => item.label === "ChatGPT");
    expect(gmail?.iconSrc).toContain("google");
    expect(chatgpt?.iconSrc).toContain("openai");
  });

  it("orders usage buckets with icons", () => {
    const recent = new Date(Date.now() - 86400000).toISOString();
    const old = new Date(Date.now() - 30 * 86400000).toISOString();
    const charts = buildTwofaChartItems([
      account({ service: "Gmail", lastUsedAt: recent }),
      account({ service: "ChatGPT", lastUsedAt: old }),
      account({ service: "Imported" }),
    ]);
    expect(charts.usageItems.map((item) => item.label)).toEqual(["Used (7d)", "Older use", "Never used"]);
    expect(charts.usageItems.every((item) => item.iconMeta)).toBe(true);
  });

  it("classifies account identity buckets", () => {
    expect(twofaAccountIdentityBucket("user@gmail.com")).toBe("Email address");
    expect(twofaAccountIdentityBucket("dev")).toBe("Username / ID");
    expect(twofaAccountIdentityBucket("account")).toBe("Missing / generic");
    expect(twofaAccountIdentityBucket("")).toBe("Missing / generic");
  });

  it("builds identity bar chart", () => {
    const charts = buildTwofaChartItems([
      account({ service: "Gmail", account: "a@gmail.com" }),
      account({ service: "GitHub", account: "dev" }),
      account({ service: "Imported", account: "account" }),
    ]);
    expect(charts.identityItems.map((item) => item.label)).toEqual([
      "Email address",
      "Username / ID",
      "Missing / generic",
    ]);
    expect(charts.identityItems.every((item) => item.iconMeta)).toBe(true);
  });

  it("splits password saved vs missing", () => {
    const charts = buildTwofaChartItems([
      account({ service: "Gmail", password: "secret" }),
      account({ service: "ChatGPT" }),
    ]);
    expect(charts.passwordItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "With password", value: 1 }),
        expect.objectContaining({ label: "No password", value: 1 }),
      ]),
    );
  });
});
