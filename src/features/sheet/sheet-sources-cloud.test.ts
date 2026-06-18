import { describe, expect, it } from "vitest";
import { mergeSheetSourcesLocalRemote, reconcileSheetSourceLists } from "./sheet-sources-cloud";
import type { SheetSource } from "./sheet-sources";

function src(partial: Partial<SheetSource> & Pick<SheetSource, "id" | "title" | "rawUrl" | "csvUrl" | "gid">): SheetSource {
  return {
    createdAt: "2026-06-01T00:00:00.000Z",
    titleSource: "auto",
    ...partial,
  };
}

describe("mergeSheetSourcesLocalRemote", () => {
  it("keeps remote uuid when merging local sh_ id for same sheet", () => {
    const local = [
      src({
        id: "sh_local1",
        title: "Sheet gid:123",
        rawUrl: "https://docs.google.com/spreadsheets/d/abc/edit#gid=123",
        csvUrl: "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=123",
        gid: "123",
      }),
    ];
    const remote = [
      src({
        id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Infi Docs",
        rawUrl: "https://docs.google.com/spreadsheets/d/abc/edit#gid=123",
        csvUrl: "https://docs.google.com/spreadsheets/d/abc/export?format=csv&gid=123",
        gid: "123",
      }),
    ];
    const merged = mergeSheetSourcesLocalRemote(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(merged[0]?.title).toBe("Infi Docs");
  });

  it("prefers manual title from local over auto remote", () => {
    const local = [
      src({
        id: "sh_local2",
        title: "My Custom",
        titleSource: "manual",
        rawUrl: "https://docs.google.com/spreadsheets/d/xyz/edit#gid=1",
        csvUrl: "https://docs.google.com/spreadsheets/d/xyz/export?format=csv&gid=1",
        gid: "1",
      }),
    ];
    const remote = [
      src({
        id: "550e8400-e29b-41d4-a716-446655440001",
        title: "Tab A",
        titleSource: "auto",
        rawUrl: "https://docs.google.com/spreadsheets/d/xyz/edit#gid=1",
        csvUrl: "https://docs.google.com/spreadsheets/d/xyz/export?format=csv&gid=1",
        gid: "1",
      }),
    ];
    const merged = mergeSheetSourcesLocalRemote(local, remote);
    expect(merged[0]?.title).toBe("My Custom");
    expect(merged[0]?.titleSource).toBe("manual");
  });
});

describe("reconcileSheetSourceLists", () => {
  it("drops cloud-deleted rows but keeps local-only pending rows", () => {
    const local = [
      src({
        id: "sh_pending",
        title: "New local",
        rawUrl: "https://docs.google.com/spreadsheets/d/new/edit#gid=9",
        csvUrl: "https://docs.google.com/spreadsheets/d/new/export?format=csv&gid=9",
        gid: "9",
      }),
      src({
        id: "550e8400-e29b-41d4-a716-446655440099",
        title: "Removed elsewhere",
        rawUrl: "https://docs.google.com/spreadsheets/d/old/edit#gid=1",
        csvUrl: "https://docs.google.com/spreadsheets/d/old/export?format=csv&gid=1",
        gid: "1",
      }),
    ];
    const remote = [
      src({
        id: "550e8400-e29b-41d4-a716-446655440010",
        title: "Cloud sheet",
        rawUrl: "https://docs.google.com/spreadsheets/d/cloud/edit#gid=2",
        csvUrl: "https://docs.google.com/spreadsheets/d/cloud/export?format=csv&gid=2",
        gid: "2",
      }),
    ];
    const merged = reconcileSheetSourceLists(local, remote);
    expect(merged.map((s) => s.title).sort()).toEqual(["Cloud sheet", "New local"]);
  });
});
