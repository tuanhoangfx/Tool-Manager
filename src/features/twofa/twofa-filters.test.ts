import { describe, expect, it } from "vitest";
import { buildTwofaServiceFilterOptions, filterTwofaAccounts } from "./twofa-filters";
import type { TwofaAccount } from "./types";

function row(service: string, account = "user@example.com"): TwofaAccount {
  return {
    id: service,
    service,
    account,
    secret: "ABCDEFGHIJKLMNOP",
    status: "active",
    ownership: "undefined",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function periodAll() {
  return { range: "all" as const, customMonth: "", customStartDate: "", customEndDate: "" };
}

describe("filterTwofaAccounts", () => {
  it("matches account and service substrings case-insensitively", () => {
    const accounts = [row("Gmail", "ada@example.com"), row("Facebook", "other@example.com")];
    const matches = filterTwofaAccounts(accounts, "ada", {}, periodAll());
    expect(matches.map((r) => r.account)).toEqual(["ada@example.com"]);
  });

  it("returns empty when query matches nothing", () => {
    const accounts = [row("Gmail"), row("Facebook")];
    expect(filterTwofaAccounts(accounts, "zzz", {}, periodAll())).toEqual([]);
  });
});

describe("buildTwofaServiceFilterOptions", () => {
  it("includes brand iconSrc for known platforms", () => {
    const options = buildTwofaServiceFilterOptions([row("Gmail"), row("ChatGPT")]);
    const gmail = options.find((opt) => opt.value === "Gmail");
    const chatgpt = options.find((opt) => opt.value === "ChatGPT");
    expect(gmail?.iconSrc).toContain("google");
    expect(chatgpt?.iconSrc).toContain("openai");
  });
});
