import { describe, expect, it } from "vitest";
import type { TwofaAccount } from "./types";
import {
  bulkUpdateTwofaMeta,
  dedupeTwofaAccounts,
  findTwofaDraftConflict,
  previewTwofaDedupe,
  updateTwofaDraft,
  upsertTwofaDraft,
} from "./twofa-upsert-accounts";
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
    status: "active",
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

  it("accepts account without 2FA secret when identity fields exist", () => {
    const outcome = upsertTwofaDraft(
      [],
      { service: "Facebook", account: "user@email.com", password: "secret-pass", secret: "" },
      "2026-06-07T00:00:00.000Z",
    );
    expect(outcome?.accounts).toHaveLength(1);
    expect(outcome?.row.secret).toBe("");
    expect(outcome?.row.password).toBe("secret-pass");
    expect(outcome?.row.status).toBe("active");
    expect(outcome?.row.log?.[0]?.message).toBe("Account created");
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

describe("updateTwofaDraft", () => {
  it("removes sibling row with same service+account when clearing secret", () => {
    const prev = [
      row("keeper", "Capcut", "user@test.com", SECRET, "2026-06-08T00:00:00.000Z"),
      row("ghost", "Capcut", "user@test.com", SECRET, "2026-06-01T00:00:00.000Z"),
    ];
    const outcome = updateTwofaDraft(
      prev,
      "keeper",
      { service: "Capcut", account: "user@test.com", secret: "" },
      "2026-06-09T00:00:00.000Z",
    );
    expect(outcome?.accounts).toHaveLength(1);
    expect(outcome?.row.id).toBe("keeper");
    expect(outcome?.row.secret).toBe("");
    expect(outcome?.removedIds).toEqual(["ghost"]);
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
      row("c", "GitHub", "dev", "KBSSY3DPEHPK3PXP"),
    ];
    const { accounts, removedIds } = dedupeTwofaAccounts(prev);
    expect(accounts).toHaveLength(2);
    expect(accounts.find((r) => r.service === "Google")?.id).toBe("b");
    expect(removedIds).toEqual(["a"]);
  });

  it("collapses same secret across different service labels", () => {
    const prev = [
      row("a", "Surfshark", "shadow@x.com", SECRET, "2026-06-01T00:00:00.000Z"),
      row("b", "VPN Surfshark", "shadow@x.com", SECRET, "2026-06-05T00:00:00.000Z"),
    ];
    const { accounts, removedIds } = dedupeTwofaAccounts(prev);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.id).toBe("b");
    expect(removedIds).toEqual(["a"]);
  });

  it("collapses vault identity split between secret-key and service-account rows", () => {
    const prev = [
      row("ghost", "Capcut", "user@test.com", SECRET, "2026-06-01T00:00:00.000Z"),
      row("keeper", "Capcut", "user@test.com", "", "2026-06-09T00:00:00.000Z"),
    ];
    const { accounts, removedIds } = dedupeTwofaAccounts(prev);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.id).toBe("keeper");
    expect(accounts[0]?.secret).toBe("");
    expect(removedIds).toContain("ghost");
  });
});

describe("previewTwofaDedupe", () => {
  it("groups removed duplicates by service", () => {
    const prev = [
      row("a", "Gmail", "a@gmail.com", SECRET, "2026-06-01T00:00:00.000Z"),
      row("b", "Gmail", "a@gmail.com", SECRET, "2026-06-05T00:00:00.000Z"),
      row("c", "ChatGPT", "x@y.com", "KBSSY3DPEHPK3PXP", "2026-06-01T00:00:00.000Z"),
      row("d", "ChatGPT", "x@y.com", "KBSSY3DPEHPK3PXP", "2026-06-04T00:00:00.000Z"),
      row("e", "ChatGPT", "z@y.com", "ZBSSY3DPEHPK3PXP", "2026-06-04T00:00:00.000Z"),
      row("f", "ChatGPT", "z@y.com", "ZBSSY3DPEHPK3PXP", "2026-06-06T00:00:00.000Z"),
    ];
    const preview = previewTwofaDedupe(prev);
    expect(preview.totalRemoved).toBe(3);
    expect(preview.byService).toEqual([
      { service: "ChatGPT", count: 2 },
      { service: "Gmail", count: 1 },
    ]);
    expect(preview.groups.length).toBeGreaterThan(0);
  });
});

describe("bulkUpdateTwofaMeta", () => {
  it("updates status and note for selected ids with audit log", () => {
    const prev = [
      row("a", "Gmail", "a@gmail.com"),
      row("b", "ChatGPT", "b@gmail.com"),
    ];
    const now = "2026-06-09T12:00:00.000Z";
    const { accounts, changed } = bulkUpdateTwofaMeta(
      prev,
      ["a", "b"],
      { status: "disable", note: "Batch" },
      now,
    );
    expect(changed).toHaveLength(2);
    expect(accounts[0]?.status).toBe("disable");
    expect(accounts[1]?.note).toBe("Batch");
    expect(accounts[0]?.log?.at(-1)?.message).toContain("Status:");
    expect(accounts[1]?.log?.at(-1)?.message).toContain("Note:");
  });

  it("appends note when appendNote is set", () => {
    const prev = [{ ...row("a", "Gmail", "a@gmail.com"), note: "Checkpoint" }];
    const { accounts, changed } = bulkUpdateTwofaMeta(
      prev,
      ["a"],
      { note: "Batch", appendNote: true },
      "2026-06-09T12:00:00.000Z",
    );
    expect(changed).toHaveLength(1);
    expect(accounts[0]?.note).toBe("Checkpoint\nBatch");
  });
});
