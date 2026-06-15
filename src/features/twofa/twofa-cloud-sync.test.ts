import { describe, expect, it } from "vitest";
import { filterPendingUploads, rowSetsFromDbRows } from "./twofa-cloud-sync";
import type { TwofaAccount } from "./types";
import type { TwofaDbRow } from "./twofa-cloud-delta";

function account(id: string): TwofaAccount {
  return {
    id,
    service: "Gmail",
    account: `${id}@test.com`,
    secret: "SECRET",
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
