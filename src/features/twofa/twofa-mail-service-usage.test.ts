import { describe, expect, it } from "vitest";
import type { TwofaAccount } from "./types";
import {
  buildTwofaMailServiceUsageIndex,
  lookupTwofaMailServiceUsage,
} from "./twofa-mail-service-usage";

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

describe("twofa-mail-service-usage", () => {
  it("counts distinct services using a mailbox via recover or login email", () => {
    const accounts = [
      row({ id: "m1", service: "Gmail", account: "ada@gmail.com" }),
      row({ id: "s1", service: "CapCut", account: "user1", mailRecover: "ada@gmail.com" }),
      row({ id: "s2", service: "Adobe", account: "ada@gmail.com" }),
      row({ id: "s3", service: "CapCut", account: "other", mailRecover: "ada@gmail.com" }),
      row({ id: "s4", service: "ChatGPT", account: "gpt-user" }),
    ];

    const index = buildTwofaMailServiceUsageIndex(accounts);
    const usage = lookupTwofaMailServiceUsage(index, accounts[0]);

    expect(usage.serviceCount).toBe(2);
    expect(usage.rowCount).toBe(3);
    expect(usage.labels).toEqual(["Adobe", "CapCut"]);
  });

  it("ignores mail-provider rows when building the index", () => {
    const accounts = [
      row({ id: "m1", service: "Gmail", account: "a@gmail.com" }),
      row({ id: "m2", service: "Outlook", account: "b@outlook.com", mailRecover: "a@gmail.com" }),
    ];
    const index = buildTwofaMailServiceUsageIndex(accounts);
    expect(lookupTwofaMailServiceUsage(index, accounts[0]).serviceCount).toBe(0);
  });
});
