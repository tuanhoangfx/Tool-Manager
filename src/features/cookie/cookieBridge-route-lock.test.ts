import { describe, expect, it } from "vitest";
import { filterActiveCookieBindingsForNote, type CookieBinding } from "./cookieBridge";

describe("filterActiveCookieBindingsForNote", () => {
  const bindings: CookieBinding[] = [
    {
      id: "b1",
      noteId: "note-a",
      syncId: "TM-abc",
      domain: ".kalodata.com",
      enabled: true,
    },
    {
      id: "b2",
      noteId: "note-b",
      syncId: "TM-def",
      domain: ".zalo.me",
      enabled: true,
    },
    {
      id: "b3",
      noteId: "note-a",
      syncId: "TM-ghi",
      domain: ".facebook.com",
      enabled: false,
    },
  ];

  it("returns enabled bindings for the note", () => {
    expect(filterActiveCookieBindingsForNote(bindings, "note-a")).toHaveLength(1);
    expect(filterActiveCookieBindingsForNote(bindings, "note-c")).toHaveLength(0);
  });
});
