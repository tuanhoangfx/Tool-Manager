import { describe, expect, it } from "vitest";
import { applyTwofaCloudDelta, type TwofaDbRow } from "./twofa-cloud-delta";
import type { TwofaAccount } from "./types";

function row(partial: Partial<TwofaDbRow> & Pick<TwofaDbRow, "id">): TwofaDbRow {
  return {
    service: "Gmail",
    browser: null,
    account: "a@b.com",
    password: null,
    secret: "SECRET",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-09T10:00:00.000Z",
    last_used_at: null,
    deleted_at: null,
    ...partial,
  };
}

function localAccount(partial: Partial<TwofaAccount> & Pick<TwofaAccount, "id">): TwofaAccount {
  return {
    service: "Gmail",
    account: "a@b.com",
    secret: "SECRET",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    ...partial,
  };
}

describe("applyTwofaCloudDelta", () => {
  it("removes local rows when tombstone arrives in delta", () => {
    const local = [localAccount({ id: "a" }), localAccount({ id: "b", service: "ChatGPT" })];
    const { accounts, maxUpdated } = applyTwofaCloudDelta(local, [
      row({ id: "a", deleted_at: "2026-06-09T11:00:00.000Z", updated_at: "2026-06-09T11:00:00.000Z" }),
    ]);
    expect(accounts.map((a) => a.id)).toEqual(["b"]);
    expect(maxUpdated).toBe("2026-06-09T11:00:00.000Z");
  });

  it("merges active remote updates by updated_at", () => {
    const local = [localAccount({ id: "a", secret: "OLD" })];
    const { accounts } = applyTwofaCloudDelta(local, [
      row({ id: "a", secret: "NEW", updated_at: "2026-06-09T12:00:00.000Z" }),
    ]);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.secret).toBe("NEW");
  });
});
