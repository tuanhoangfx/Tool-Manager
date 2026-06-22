import { describe, expect, it } from "vitest";
import type { CookieBinding } from "./cookieBridge";
import { dedupeCookieBindingsByNoteId } from "./cookieRoutesRepository";

function row(partial: Partial<CookieBinding> & Pick<CookieBinding, "id" | "noteId" | "domain">): CookieBinding {
  return {
    id: partial.id,
    noteId: partial.noteId,
    domain: partial.domain,
    syncId: partial.syncId ?? "sync-1",
    enabled: partial.enabled ?? true,
    routeUpdatedAt: partial.routeUpdatedAt ?? null,
  };
}

describe("dedupeCookieBindingsByNoteId", () => {
  it("keeps one route per note when domains normalize to the same host", () => {
    const bindings = [
      row({ id: "a", noteId: "note-1", domain: ".mail.google.com", routeUpdatedAt: "2026-06-22T02:30:00Z" }),
      row({ id: "b", noteId: "note-1", domain: ".google.com", routeUpdatedAt: "2026-06-22T02:46:00Z" }),
    ];
    const out = dedupeCookieBindingsByNoteId(bindings);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("b");
  });
});
