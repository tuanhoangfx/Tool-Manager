import { describe, expect, it } from "vitest";
import { applyTwofaCloudDelta, type TwofaDbRow } from "./twofa-cloud-delta";
import type { TwofaAccount } from "./types";

function row(partial: Partial<TwofaDbRow> & Pick<TwofaDbRow, "id">): TwofaDbRow {
  return {
    service: "Gmail",
    browser: null,
    account: "a@b.com",
    mail_recover: null,
    password: null,
    secret: "SECRET",
    note: null,
    status: "active",
    ownership: "undefined",
    log: [],
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-09T10:00:00.000Z",
    last_used_at: null,
    plan_package: null,
    plan_status: null,
    plan_tier: null,
    plan_expires_at: null,
    quota_snapshot: null,
    quota_checked_at: null,
    quota_status: null,
    deleted_at: null,
    ...partial,
  };
}

function localAccount(partial: Partial<TwofaAccount> & Pick<TwofaAccount, "id">): TwofaAccount {
  return {
    service: "Gmail",
    account: "a@b.com",
    secret: "SECRET",
    status: "active",
    ownership: "undefined",
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

  it("keeps local cleared secret when remote echo has same updated_at", () => {
    const ts = "2026-06-09T12:00:00.000Z";
    const local = [localAccount({ id: "a", secret: "", updatedAt: ts })];
    const { accounts } = applyTwofaCloudDelta(local, [row({ id: "a", secret: "STALE", updated_at: ts })]);
    expect(accounts[0]?.secret).toBe("");
  });
});
