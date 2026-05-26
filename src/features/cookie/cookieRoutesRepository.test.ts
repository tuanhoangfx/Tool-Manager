import { describe, expect, it } from "vitest";
import { mergeCookieRoutes, type CookieCloudRouteRow } from "./cookieRoutesRepository";
import type { CookieBinding } from "./cookieBridge";
import type { NoteListItem } from "../notes/types";

function route(overrides: Partial<CookieCloudRouteRow> = {}): CookieCloudRouteRow {
  return {
    id: "route-1",
    user_id: "user-1",
    note_id: "note-1",
    sync_id: "TM-12345678",
    domain: "https://www.facebook.com",
    note_title: "Facebook",
    enabled: true,
    source_browser_id: "browser-source",
    source_label: "Source profile",
    source_locked_at: "2026-05-26T00:00:00Z",
    updated_at: "2026-05-26T00:00:00Z",
    ...overrides,
  };
}

function note(overrides: Partial<NoteListItem> = {}): NoteListItem {
  return {
    id: "note-1",
    user_id: "user-1",
    title: "Facebook note",
    slug: "facebook-note",
    domain: ".facebook.com",
    body_md: "",
    cookie_snapshot: [],
    pinned: false,
    share_enabled: false,
    share_token: null,
    share_password_hash: null,
    share_expires_at: null,
    share_view_count: 0,
    sync_status: "manual",
    synced_at: null,
    sync_id: "TM-note",
    sync_pass_hash: null,
    created_at: "2026-05-26T00:00:00Z",
    updated_at: "2026-05-26T00:00:00Z",
    syncLabel: "Manual",
    syncTone: "amber",
    updatedLabel: "May 26",
    ...overrides,
  };
}

describe("mergeCookieRoutes", () => {
  it("normalizes cloud route domain and preserves local pass", () => {
    const existing: CookieBinding[] = [
      {
        id: "local-1",
        noteId: "note-1",
        syncId: "TM-local",
        domain: ".facebook.com",
        pass: "local-secret",
        enabled: true,
      },
    ];

    const merged = mergeCookieRoutes(existing, [route()], [note()]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: "local-1",
      domain: ".facebook.com",
      pass: "local-secret",
      sourceBrowserId: "browser-source",
    });
  });

  it("drops stale local routes when replacing from active cloud routes", () => {
    const existing: CookieBinding[] = [
      {
        id: "local-1",
        noteId: "note-1",
        syncId: "TM-local",
        domain: ".facebook.com",
        pass: "local-secret",
        enabled: true,
      },
      {
        id: "stale-1",
        noteId: "note-old",
        syncId: "TM-stale",
        domain: ".kalodata.com",
        enabled: true,
      },
    ];

    const merged = mergeCookieRoutes(existing, [route()], [note()], { replace: true });

    expect(merged).toHaveLength(1);
    expect(merged[0].noteId).toBe("note-1");
    expect(merged[0].pass).toBe("local-secret");
  });
});
