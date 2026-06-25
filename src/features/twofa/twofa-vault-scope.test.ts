import { describe, expect, it } from "vitest";
import type { TwofaAccount } from "./types";
import { filterTwofaVaultScope, isTwofaMailAccount } from "./twofa-vault-scope";

function row(partial: Partial<TwofaAccount> & Pick<TwofaAccount, "id" | "service" | "account">): TwofaAccount {
  return {
    secret: "",
    status: "active",
    ownership: "undefined",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("twofa-vault-scope", () => {
  it("detects mail only by service name (mailbox providers)", () => {
    expect(isTwofaMailAccount(row({ id: "1", service: "Gmail", account: "ada@gmail.com" }))).toBe(true);
    expect(isTwofaMailAccount(row({ id: "2", service: "Outlook", account: "x@outlook.com" }))).toBe(true);
    expect(isTwofaMailAccount(row({ id: "3", service: "Hotmail", account: "b@hotmail.com" }))).toBe(true);
  });

  it("keeps third-party services in Services even when account is an email", () => {
    expect(isTwofaMailAccount(row({ id: "4", service: "Adobe", account: "user@gmail.com" }))).toBe(false);
    expect(isTwofaMailAccount(row({ id: "5", service: "CapCut", account: "creator@outlook.com" }))).toBe(false);
    expect(isTwofaMailAccount(row({ id: "6", service: "Facebook", account: "user@outlook.com" }))).toBe(false);
  });

  it("splits vault into services vs mail slices", () => {
    const accounts = [
      row({ id: "1", service: "Gmail", account: "a@gmail.com" }),
      row({ id: "2", service: "ChatGPT", account: "user123" }),
      row({ id: "3", service: "CapCut", account: "b@hotmail.com" }),
      row({ id: "4", service: "Adobe", account: "c@gmail.com" }),
    ];
    expect(filterTwofaVaultScope(accounts, "mail").map((r) => r.id)).toEqual(["1"]);
    expect(filterTwofaVaultScope(accounts, "services").map((r) => r.id)).toEqual(["2", "3", "4"]);
  });
});
