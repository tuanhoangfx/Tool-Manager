import { describe, expect, it } from "vitest";
import { shouldSyncSheetTabTitle } from "./sheet-tab-title";

describe("shouldSyncSheetTabTitle", () => {
  it("syncs auto titles", () => {
    expect(shouldSyncSheetTabTitle({ title: "🌐 Web", titleSource: "auto" })).toBe(true);
  });

  it("skips manual titles", () => {
    expect(shouldSyncSheetTabTitle({ title: "My Custom Name", titleSource: "manual" })).toBe(false);
  });

  it("syncs legacy default gid titles", () => {
    expect(shouldSyncSheetTabTitle({ title: "Sheet gid:188963889" })).toBe(true);
  });
});
