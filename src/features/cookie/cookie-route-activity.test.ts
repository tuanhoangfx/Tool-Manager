import { describe, expect, it } from "vitest";
import type { CookieBinding } from "./cookieBridge";
import { routeActivityAt, routeMatchesTimeRange } from "./cookie-route-activity";
import type { NoteListItem } from "../notes/types";

const binding: CookieBinding = {
  id: "b1",
  noteId: "note-1",
  syncId: "",
  domain: ".facebook.com",
  enabled: true,
  routeUpdatedAt: "2026-06-01T12:00:00Z",
};

const oldNote: NoteListItem = {
  id: "note-1",
  user_id: "u1",
  title: "Old",
  slug: "old",
  domain: "",
  body_md: "",
  cookie_snapshot: [],
  pinned: false,
  share_enabled: false,
  share_token: null,
  share_password_hash: null,
  share_expires_at: null,
  share_view_count: 0,
  sync_status: "pending",
  synced_at: null,
  sync_id: null,
  sync_pass_hash: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  syncLabel: "Pending",
  syncTone: "amber",
  updatedLabel: "Jan 2024",
};

describe("routeActivityAt", () => {
  it("uses note synced_at when present", () => {
    const synced = { ...oldNote, synced_at: "2026-06-02T08:00:00Z" };
    expect(routeActivityAt(binding, synced)).toBe("2026-06-02T08:00:00Z");
  });

  it("falls back to note updated_at, then cloud route date", () => {
    expect(routeActivityAt(binding, oldNote)).toBe("2024-01-01T00:00:00Z");
    expect(routeActivityAt(binding, undefined)).toBe("2026-06-01T12:00:00Z");
    const localOnly = { ...binding, routeUpdatedAt: undefined };
    expect(routeActivityAt(localOnly, oldNote)).toBe("2024-01-01T00:00:00Z");
  });
});

describe("routeMatchesTimeRange", () => {
  it("shows shared routes without a local note when cloud route is recent", () => {
    expect(routeMatchesTimeRange(binding, undefined, "30d")).toBe(true);
  });

  it("includes routes with no activity timestamp in bounded ranges", () => {
    const noDates = { ...binding, routeUpdatedAt: undefined };
    expect(routeMatchesTimeRange(noDates, undefined, "30d")).toBe(true);
  });
});
