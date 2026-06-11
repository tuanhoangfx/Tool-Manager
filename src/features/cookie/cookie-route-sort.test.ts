import { describe, expect, it } from "vitest";
import type { CookieAutoRow } from "./cookieAutoRow";
import { sortCookieAutoRows } from "./cookie-route-sort";

function row(partial: {
  title?: string;
  domain?: string;
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
}): CookieAutoRow {
  return {
    binding: {
      id: partial.title ?? partial.domain ?? "id",
      enabled: true,
      noteId: "n1",
      syncId: "TM-abc",
      domain: partial.domain ?? ".example.com",
      noteTitle: partial.title,
    },
    note: {
      id: "n1",
      title: partial.title ?? "Untitled",
      created_at: partial.created_at ?? "2026-01-01T00:00:00Z",
      updated_at: partial.updated_at ?? "2026-01-02T00:00:00Z",
      synced_at: partial.synced_at ?? null,
    } as CookieAutoRow["note"],
    lines: [],
  };
}

describe("sortCookieAutoRows", () => {
  it("sorts by title A–Z", () => {
    const sorted = sortCookieAutoRows(
      [row({ title: "Zebra" }), row({ title: "Alpha" })],
      "title",
    );
    expect(sorted.map((r) => r.note?.title)).toEqual(["Alpha", "Zebra"]);
  });

  it("sorts by synced time desc for updated", () => {
    const sorted = sortCookieAutoRows(
      [
        row({ title: "old", synced_at: "2026-01-01T00:00:00Z" }),
        row({ title: "new", synced_at: "2026-06-01T00:00:00Z" }),
      ],
      "updated",
    );
    expect(sorted[0].note?.title).toBe("new");
  });
});
