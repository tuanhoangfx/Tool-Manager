import { describe, expect, it } from "vitest";
import { buildTwofaChartItems, buildTwofaKpis, twofaAccountIdentityBucket } from "./twofa-aggregates";
import type { TwofaAccount } from "./types";

function account(partial: Partial<TwofaAccount> & Pick<TwofaAccount, "service">): TwofaAccount {
  return {
    id: partial.id ?? "1",
    service: partial.service,
    account: partial.account ?? "user@example.com",
    secret: partial.secret ?? "ABCDEFGHIJKLMNOP",
    status: partial.status ?? "active",
    ownership: partial.ownership ?? "undefined",
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
    expect(chatgpt?.iconSrc).toBe("/assets/brand-icons/chatgpt.png");
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

describe("buildTwofaKpis", () => {
  const allKeys = new Set([
    "accounts_total",
    "accounts_shown",
    "identified_accounts",
    "with_password",
    "used_7d",
  ]);

  it("omits hint on accounts_shown when full list is shown", () => {
    const rows = [account({ service: "Gmail" }), account({ id: "2", service: "GitHub" })];
    const kpis = buildTwofaKpis(rows, rows, allKeys);
    const shown = kpis.find((k) => k.prefKey === "accounts_shown");
    expect(shown?.value).toBe(2);
    expect(shown?.hint).toBeUndefined();
  });

  it("shows total hint on accounts_shown when filtered subset", () => {
    const rows = [account({ service: "Gmail" }), account({ id: "2", service: "GitHub" })];
    const kpis = buildTwofaKpis(rows, [rows[0]!], allKeys);
    const shown = kpis.find((k) => k.prefKey === "accounts_shown");
    expect(shown?.value).toBe(1);
    expect(shown?.hint).toBe("2 total");
  });

  it("omits hint on derived KPIs when unfiltered counts match", () => {
    const rows = [account({ service: "Gmail", password: "x" })];
    const kpis = buildTwofaKpis(rows, rows, allKeys);
    expect(kpis.find((k) => k.prefKey === "with_password")?.hint).toBeUndefined();
    expect(kpis.find((k) => k.prefKey === "identified_accounts")?.hint).toBeUndefined();
  });
});
