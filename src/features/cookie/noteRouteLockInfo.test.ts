import { describe, expect, it } from "vitest";
import { formatRouteOpenTooltip, mergeNoteRouteLockInfo } from "./noteRouteLockInfo";
import type { CookieBinding } from "./cookieBridge";
import type { CookieCloudRouteRow } from "./cookieRoutesRepository";

describe("mergeNoteRouteLockInfo", () => {
  it("merges cloud rows and local bindings by domain", () => {
    const cloud: CookieCloudRouteRow[] = [
      {
        id: "r1",
        user_id: "u1",
        note_id: "note-a",
        sync_id: "TM-cloud",
        domain: ".kalodata.com",
        note_title: "Kalodata",
        enabled: true,
        source_browser_id: null,
        source_label: null,
        source_locked_at: null,
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    const local: CookieBinding[] = [
      {
        id: "b1",
        noteId: "note-a",
        syncId: "TM-local",
        domain: ".zalo.me",
        enabled: true,
      },
    ];
    const merged = mergeNoteRouteLockInfo(cloud, local);
    expect(merged).toHaveLength(2);
    expect(merged.find((r) => r.domain === ".kalodata.com")?.syncId).toBe("TM-cloud");
    expect(merged.find((r) => r.domain === ".zalo.me")?.syncId).toBe("TM-local");
  });
});

describe("formatRouteOpenTooltip", () => {
  it("includes domain, lock status, and route title", () => {
    const tip = formatRouteOpenTooltip({
      domain: ".kalodata.com",
      syncId: "TM-42",
      noteTitle: "Kalodata shop",
    });
    expect(tip).toContain(".kalodata.com");
    expect(tip).toContain("Lock: active");
    expect(tip).toContain("TM-42");
    expect(tip).toContain("Kalodata shop");
  });

  it("notes note-id sync when sync id is missing", () => {
    const tip = formatRouteOpenTooltip({
      domain: ".zalo.me",
      syncId: null,
      noteTitle: null,
    });
    expect(tip).toContain(".zalo.me");
    expect(tip).toContain("Sync via note ID");
  });
});
