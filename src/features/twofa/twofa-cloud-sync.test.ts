import { describe, expect, it } from "vitest";
import { filterPendingUploads, rowSetsFromDbRows, selectTwofaCloudPush } from "./twofa-cloud-sync";
import { mergeAccounts, type TwofaDbRow } from "./twofa-cloud-delta";
import type { TwofaAccount } from "./types";

function account(id: string): TwofaAccount {
  return {
    id,
    service: "Gmail",
    account: `${id}@test.com`,
    secret: "SECRET",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("filterPendingUploads", () => {
  it("treats rows missing from cloud id set as pending", () => {
    const activeIds = new Set(["known-1", "known-2"]);
    const local = [account("known-1"), account("orphan-local")];
    const pending = filterPendingUploads(local, { activeIds, tombstoneIds: new Set() });
    expect(pending.map((row) => row.id)).toEqual(["orphan-local"]);
  });

  it("ignores tombstoned ids even when absent from active set", () => {
    const pending = filterPendingUploads([account("deleted-1")], {
      activeIds: new Set(),
      tombstoneIds: new Set(["deleted-1"]),
    });
    expect(pending).toHaveLength(0);
  });

  it("does not mark cloud rows as pending when id set is complete", () => {
    const ids = Array.from({ length: 1500 }, (_, i) => `row-${i}`);
    const activeIds = new Set(ids);
    const local = [account("row-1200"), account("row-1499")];
    const pending = filterPendingUploads(local, { activeIds, tombstoneIds: new Set() });
    expect(pending).toHaveLength(0);
  });
});

describe("selectTwofaCloudPush", () => {
  it("pushes local row newer than remote snapshot", () => {
    const remote = [account("known-1")];
    const local = [{ ...account("known-1"), secret: "", updatedAt: "2026-06-09T00:00:00.000Z" }];
    const push = selectTwofaCloudPush(
      local,
      remote,
      { activeIds: new Set(["known-1"]), tombstoneIds: new Set() },
      "2026-06-01T00:00:00.000Z",
    );
    expect(push).toHaveLength(1);
    expect(push[0]?.secret).toBe("");
  });

  it("skips unchanged local rows absent from delta batch", () => {
    const local = [account("known-1")];
    const push = selectTwofaCloudPush(
      local,
      [],
      { activeIds: new Set(["known-1"]), tombstoneIds: new Set() },
      "2026-06-02T00:00:00.000Z",
    );
    expect(push).toHaveLength(0);
  });

  it("does not push stale orphan duplicate that shares vault identity on cloud", () => {
    const cloud: TwofaAccount = {
      id: "cloud-id",
      service: "Capcut",
      account: "user@test.com",
      secret: "SECRET",
      status: "active",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const orphan: TwofaAccount = {
      id: "orphan-local",
      service: "Capcut",
      account: "user@test.com",
      secret: "STALE",
      status: "active",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    };
    const cleared: TwofaAccount = {
      ...cloud,
      secret: "",
      updatedAt: "2026-06-09T00:00:00.000Z",
    };
    const push = selectTwofaCloudPush(
      [orphan, cleared],
      [cloud],
      { activeIds: new Set(["cloud-id"]), tombstoneIds: new Set() },
      "2026-06-08T00:00:00.000Z",
    );
    expect(push.map((row) => row.id)).toEqual(["cloud-id"]);
    expect(push[0]?.secret).toBe("");
  });
});

describe("mergeAccounts local wins", () => {
  it("keeps newer local secret clear over older remote secret", () => {
    const remote = [account("known-1")];
    const local = [{ ...account("known-1"), secret: "", updatedAt: "2026-06-09T00:00:00.000Z" }];
    const merged = mergeAccounts(remote, local, { incomingWinsOnTie: true });
    expect(merged[0]?.secret).toBe("");
  });

  it("keeps base local clear on equal updatedAt (stale realtime delta)", () => {
    const ts = "2026-06-09T00:00:00.000Z";
    const local = [{ ...account("known-1"), secret: "", updatedAt: ts }];
    const remote = [{ ...account("known-1"), secret: "SECRET", updatedAt: ts }];
    const merged = mergeAccounts(local, remote);
    expect(merged[0]?.secret).toBe("");
  });
});

describe("rowSetsFromDbRows", () => {
  it("classifies active and tombstoned ids from one scan", () => {
    const rows: TwofaDbRow[] = [
      {
        id: "a1",
        service: "Gmail",
        browser: null,
        account: "a@test.com",
        password: null,
        secret: "S1",
        note: null,
        status: "active",
        log: [],
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-01T00:00:00.000Z",
        last_used_at: null,
        deleted_at: null,
      },
      {
        id: "t1",
        service: "Gmail",
        browser: null,
        account: "b@test.com",
        password: null,
        secret: "S2",
        note: null,
        status: "active",
        log: [],
        created_at: "2026-06-01T00:00:00.000Z",
        updated_at: "2026-06-02T00:00:00.000Z",
        last_used_at: null,
        deleted_at: "2026-06-02T00:00:00.000Z",
      },
    ];
    const sets = rowSetsFromDbRows(rows);
    expect([...sets.activeIds]).toEqual(["a1"]);
    expect([...sets.tombstoneIds]).toEqual(["t1"]);
  });
});
