import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteSheetGridCache,
  hydrateSheetGridCache,
  readSheetGridCache,
  writeSheetGridCache,
} from "./sheet-grid-cache";

const GRID = { header: ["A", "B"], rows: [["1", "2"]] };

function mockSessionStorage() {
  const store = new Map<string, string>();
  const api = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal("sessionStorage", api);
  return api;
}

describe("sheet-grid-cache", () => {
  beforeEach(() => {
    mockSessionStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips grid per sheet id", () => {
    writeSheetGridCache("sh_1", GRID);
    expect(readSheetGridCache("sh_1")).toEqual(GRID);
    expect(readSheetGridCache("sh_2")).toBeNull();
  });

  it("hydrates map and deletes entry", () => {
    writeSheetGridCache("sh_a", GRID);
    writeSheetGridCache("sh_b", GRID);
    const map = hydrateSheetGridCache();
    expect(map.size).toBe(2);
    deleteSheetGridCache("sh_a");
    expect(readSheetGridCache("sh_a")).toBeNull();
    expect(hydrateSheetGridCache().size).toBe(1);
  });
});
