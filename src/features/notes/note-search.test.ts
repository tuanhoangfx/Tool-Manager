import { describe, expect, it } from "vitest";
import { filterNotes } from "./notes-filters";
import { toListItem } from "./noteUtils";
import type { NoteRow } from "./types";

const sampleRow: NoteRow = {
  id: "a0df8ce9-73df-4884-972e-70a2ace26936",
  user_id: "u1",
  title: "Kalodata",
  slug: "kalodata",
  domain: "kalodata.com",
  body_md: "",
  cookie_snapshot: null,
  pinned: false,
  share_enabled: false,
  share_can_edit: false,
  share_token: null,
  share_password_hash: null,
  share_expires_at: null,
  share_view_count: 0,
  sync_status: "synced",
  synced_at: null,
  sync_id: "TM-w2a80381",
  sync_pass_hash: null,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-03T00:00:00.000Z",
};

const sample = toListItem(sampleRow);

describe("filterNotes search by note id", () => {
  it("matches full UUID in search", () => {
    const out = filterNotes([sample], "a0df8ce9-73df-4884-972e-70a2ace26936", {}, "all");
    expect(out).toHaveLength(1);
  });

  it("matches UUID without hyphens", () => {
    const out = filterNotes([sample], "a0df8ce973df4884972e70a2ace26936", {}, "all");
    expect(out).toHaveLength(1);
  });

  it("matches id prefix after stripping ID label", () => {
    const out = filterNotes([sample], "id a0df8ce9", {}, "all");
    expect(out).toHaveLength(1);
  });
});
