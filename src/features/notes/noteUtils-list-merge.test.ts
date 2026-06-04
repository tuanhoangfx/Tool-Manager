import { describe, expect, it } from "vitest";
import { mergeNoteRowForList, sortNoteRows } from "./noteUtils";
import type { NoteRow } from "./types";

function row(overrides: Partial<NoteRow> & Pick<NoteRow, "id">): NoteRow {
  return {
    user_id: "u1",
    title: "T",
    slug: "t",
    domain: "",
    body_md: "",
    cookie_snapshot: null,
    pinned: false,
    share_enabled: false,
    share_token: null,
    share_password_hash: null,
    share_expires_at: null,
    share_view_count: 0,
    sync_status: "manual",
    synced_at: null,
    sync_id: null,
    sync_pass_hash: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("mergeNoteRowForList", () => {
  it("updates list fields but keeps list-light body and cookie_snapshot", () => {
    const existing = row({ id: "a", body_md: "", cookie_snapshot: null });
    const saved = row({
      id: "a",
      title: "New title",
      body_md: "heavy body",
      cookie_snapshot: [{ line: "x" }],
      updated_at: "2026-06-02T12:00:00Z",
    });
    const merged = mergeNoteRowForList(existing, saved);
    expect(merged.title).toBe("New title");
    expect(merged.updated_at).toBe("2026-06-02T12:00:00Z");
    expect(merged.body_md).toBe("");
    expect(merged.cookie_snapshot).toBeNull();
  });
});

describe("sortNoteRows", () => {
  it("pins first then sorts by updated_at desc", () => {
    const sorted = sortNoteRows([
      row({ id: "a", pinned: true, updated_at: "2026-06-01T00:00:00Z" }),
      row({ id: "b", pinned: false, updated_at: "2026-06-03T00:00:00Z" }),
      row({ id: "c", pinned: false, updated_at: "2026-06-02T00:00:00Z" }),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["a", "b", "c"]);
  });

  it("uses synced_at for cookie-route notes", () => {
    const cookieIds = new Set(["cookie"]);
    const sorted = sortNoteRows(
      [
        row({
          id: "cookie",
          updated_at: "2026-06-05T00:00:00Z",
          synced_at: "2026-06-01T00:00:00Z",
        }),
        row({ id: "plain", updated_at: "2026-06-02T00:00:00Z", synced_at: null }),
      ],
      "updated",
      cookieIds,
    );
    expect(sorted.map((n) => n.id)).toEqual(["plain", "cookie"]);
  });
});
