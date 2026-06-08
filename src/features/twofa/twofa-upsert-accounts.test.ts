import { describe, expect, it } from "vitest";
import type { TwofaAccount } from "./types";
import { dedupeTwofaAccounts, findTwofaDraftConflict, upsertTwofaDraft } from "./twofa-upsert-accounts";
import { twofaIdentityKey } from "./twofa-identity";

const SECRET = "JBSWY3DPEHPK3PXP";

function row(
  id: string,
  service: string,
  account: string,
  secret = SECRET,
  updatedAt = "2026-06-01T00:00:00.000Z",
): TwofaAccount {
  return {
    id,
    service,
    account,
    secret,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt,
  };
}

describe("twofaIdentityKey", () => {
  it("uses service+account when either is set", () => {
    expect(twofaIdentityKey("Google", "user@gmail.com", SECRET)).toBe(
      twofaIdentityKey("google", "user@gmail.com", "OTHER"),
    );
  });

  it("uses secret when service and account are empty", () => {
    expect(twofaIdentityKey("", "", SECRET)).toBe(`secret:${SECRET}`);
  });

  it("includes browser when set", () => {
    expect(twofaIdentityKey("Google", "user@gmail.com", SECRET, "0100")).not.toBe(
      twofaIdentityKey("Google", "user@gmail.com", SECRET),
    );
  });
});

describe("upsertTwofaDraft", () => {
  it("appends a new row when identity is unique", () => {
    const prev = [row("a", "GitHub", "dev")];
    const outcome = upsertTwofaDraft(prev, { service: "Google", account: "me", secret: SECRET }, "2026-06-07T00:00:00.000Z");
    expect(outcome?.replaced).toBe(false);
    expect(outcome?.accounts).toHaveLength(2);
  });

  it("replaces existing row with same service+account", () => {
    const prev = [row("keep-id", "Google", "user@gmail.com", SECRET, "2026-06-01T00:00:00.000Z")];
    const outcome = upsertTwofaDraft(
      prev,
      { service: "Google", account: "user@gmail.com", secret: "NBSWY3DPEHPK3PXP", password: "new-pass" },
      "2026-06-07T00:00:00.000Z",
    );
    expect(outcome?.replaced).toBe(true);
    expect(outcome?.accounts).toHaveLength(1);
    expect(outcome?.row.id).toBe("keep-id");
    expect(outcome?.row.secret).toBe("NBSWY3DPEHPK3PXP");
    expect(outcome?.row.password).toBe("new-pass");
    expect(outcome?.removedIds).toEqual([]);
  });

  it("removes extra duplicates and keeps newest when replacing", () => {
    const prev = [
      row("old-1", "Google", "user@gmail.com", SECRET, "2026-06-01T00:00:00.000Z"),
      row("old-2", "Google", "user@gmail.com", SECRET, "2026-06-02T00:00:00.000Z"),
    ];
    const outcome = upsertTwofaDraft(
      prev,
      { service: "Google", account: "user@gmail.com", secret: "NBSWY3DPEHPK3PXP" },
      "2026-06-07T00:00:00.000Z",
    );
    expect(outcome?.accounts).toHaveLength(1);
    expect(outcome?.row.id).toBe("old-2");
    expect(outcome?.removedIds).toEqual(["old-1"]);
  });

  it("treats same service+account on different browsers as separate rows", () => {
    const prev = [row("a", "Google", "user@gmail.com")];
    const outcome = upsertTwofaDraft(
      prev,
      { service: "Google", account: "user@gmail.com", browser: "0100", secret: SECRET },
      "2026-06-07T00:00:00.000Z",
    );
    expect(outcome?.replaced).toBe(false);
    expect(outcome?.accounts).toHaveLength(2);
    expect(outcome?.row.browser).toBe("0100");
  });

  it("dedupes within batch — last row wins", () => {
    let list: TwofaAccount[] = [];
    const now = "2026-06-07T00:00:00.000Z";
    const first = upsertTwofaDraft(list, { service: "Google", account: "a", secret: SECRET }, now);
    list = first!.accounts;
    const second = upsertTwofaDraft(
      list,
      { service: "Google", account: "a", secret: "NBSWY3DPEHPK3PXP" },
      now,
    );
    expect(second?.replaced).toBe(true);
    expect(second?.accounts).toHaveLength(1);
    expect(second?.row.secret).toBe("NBSWY3DPEHPK3PXP");
  });
});

describe("findTwofaDraftConflict", () => {
  it("detects conflict with another row", () => {
    const prev = [
      row("a", "Google", "user@gmail.com"),
      row("b", "GitHub", "dev"),
    ];
    const conflict = findTwofaDraftConflict(prev, { service: "Google", account: "user@gmail.com", secret: SECRET }, "b");
    expect(conflict?.id).toBe("a");
  });

  it("ignores the excluded row", () => {
    const prev = [row("a", "Google", "user@gmail.com")];
    expect(
      findTwofaDraftConflict(prev, { service: "Google", account: "user@gmail.com", secret: SECRET }, "a"),
    ).toBeNull();
  });
});

describe("dedupeTwofaAccounts", () => {
  it("collapses existing duplicates on load", () => {
    const prev = [
      row("a", "Google", "user@gmail.com", SECRET, "2026-06-01T00:00:00.000Z"),
      row("b", "Google", "user@gmail.com", SECRET, "2026-06-05T00:00:00.000Z"),
      row("c", "GitHub", "dev"),
    ];
    const { accounts, removedIds } = dedupeTwofaAccounts(prev);
    expect(accounts).toHaveLength(2);
    expect(accounts.find((r) => r.service === "Google")?.id).toBe("b");
    expect(removedIds).toEqual(["a"]);
  });
});
