import { describe, expect, it } from "vitest";
import type { TwofaAccount } from "./types";
import { dropShadowLocalRows, twofaVaultSlotKey } from "./twofa-identity";
import { dedupeTwofaAccounts } from "./twofa-upsert-accounts";

function row(
  id: string,
  service: string,
  account: string,
  secret = "",
  browser?: string,
  updatedAt = "2026-06-09T00:00:00.000Z",
): TwofaAccount {
  return {
    id,
    service,
    account,
    secret,
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt,
    ...(browser ? { browser } : {}),
  };
}

describe("twofaVaultSlotKey", () => {
  it("ignores browser for slot grouping", () => {
    expect(twofaVaultSlotKey("Capcut", "a@b.com")).toBe(twofaVaultSlotKey("capcut", "a@b.com"));
  });
});

describe("dropShadowLocalRows", () => {
  it("removes local orphan when cloud owns the same service+account slot", () => {
    const remote = [row("cloud-id", "Capcut", "a@b.com", "SECRET")];
    const merged = [
      ...remote,
      row("local-ghost", "Capcut", "a@b.com", "STALE", "A004"),
    ];
    const next = dropShadowLocalRows(merged, remote);
    expect(next.map((r) => r.id)).toEqual(["cloud-id"]);
  });
});

describe("dedupeTwofaAccounts slot collapse", () => {
  it("merges same account with different browser codes", () => {
    const prev = [
      row("a", "Capcut", "l1ip4@outlook.com", "SECRET", "A004", "2026-06-01T00:00:00.000Z"),
      row("b", "Capcut", "l1ip4@outlook.com", "", undefined, "2026-06-09T00:00:00.000Z"),
    ];
    const { accounts, removedIds } = dedupeTwofaAccounts(prev);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.id).toBe("b");
    expect(removedIds).toContain("a");
  });
});
