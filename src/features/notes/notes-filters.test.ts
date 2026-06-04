import { describe, expect, it } from "vitest";
import { filterNotes, notesFilterOptions } from "./notes-filters";
import type { NoteListItem } from "./types";

function note(overrides: Partial<NoteListItem>): NoteListItem {
  return {
    id: "note-1",
    user_id: "user-1",
    title: "Cookie Facebook",
    slug: "cookie-facebook",
    domain: ".facebook.com",
    body_md: "",
    cookie_snapshot: null,
    pinned: false,
    share_enabled: false,
    share_can_edit: false,
    share_token: null,
    share_password_hash: null,
    share_expires_at: null,
    share_view_count: 0,
    sync_status: "pending",
    synced_at: null,
    sync_id: "SYNC-1",
    sync_pass_hash: null,
    created_at: "2026-05-26T00:00:00.000Z",
    updated_at: "2026-05-26T00:00:00.000Z",
    syncLabel: "Pending",
    syncTone: "amber",
    updatedLabel: "Today",
    ...overrides,
  };
}

describe("notes filters", () => {
  it("uses the same option values that the matcher expects", () => {
    expect(notesFilterOptions([]).pinned.map((option) => option.value)).toEqual(["pinned", "unpinned"]);
    expect(notesFilterOptions([]).share.map((option) => option.value)).toEqual(["edit", "view", "private"]);
  });

  it("filters by pinned, sync, share, query and time range", () => {
    const notes = [
      note({ id: "a", pinned: true, share_enabled: true, sync_status: "synced", title: "Alpha" }),
      note({ id: "b", pinned: false, share_enabled: false, sync_status: "pending", title: "Beta" }),
    ];

    expect(
      filterNotes(
        notes,
        "alpha",
        {
          pinned: ["pinned"],
          sync: ["synced"],
          share: ["view"],
        },
        "all",
      ).map((item) => item.id),
    ).toEqual(["a"]);
  });
});
