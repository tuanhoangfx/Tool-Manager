import { describe, expect, it } from "vitest";
import type { TwofaAccount } from "./types";
import { compareTwofaBrowser, compareTwofaService, sortTwofaAccounts } from "./twofa-sort";

function row(service: string, browser?: string): TwofaAccount {
  return {
    id: `${service}-${browser ?? ""}`,
    service,
    account: "user@example.com",
    secret: "ABCDEFGHIJKLMNOP",
    status: "active",
    ownership: "undefined",
    browser,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("compareTwofaBrowser", () => {
  it("sorts numeric profile codes in order", () => {
    expect(compareTwofaBrowser("0000", "0001")).toBeLessThan(0);
    expect(compareTwofaBrowser("0009", "0010")).toBeLessThan(0);
    expect(compareTwofaBrowser("0133", "0001")).toBeGreaterThan(0);
  });
});

describe("sortTwofaAccounts", () => {
  it("orders by service A→Z then browser 0000, 0001, …", () => {
    const accounts = [
      row("Zoom", "0002"),
      row("Adobe", "0001"),
      row("Adobe", "0000"),
      row("68sms", "0001"),
    ];
    const sorted = sortTwofaAccounts(accounts, "service", "asc");
    expect(sorted.map((r) => `${r.service}|${r.browser}`)).toEqual([
      "68sms|0001",
      "Adobe|0000",
      "Adobe|0001",
      "Zoom|0002",
    ]);
  });

  it("uses service as tiebreaker when sorting by browser", () => {
    const accounts = [row("Zoom", "0001"), row("Adobe", "0001")];
    const sorted = sortTwofaAccounts(accounts, "browser", "asc");
    expect(sorted.map((r) => r.service)).toEqual(["Adobe", "Zoom"]);
  });
});

describe("compareTwofaService", () => {
  it("sorts case-insensitively with numeric segments", () => {
    expect(compareTwofaService("68sms", "Adobe")).toBeLessThan(0);
    expect(compareTwofaService("acc douyin", "acc weibo")).toBeLessThan(0);
  });
});
