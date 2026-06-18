import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  reconcileSheetGridPrefs,
  readSheetGridPrefs,
  resetSheetGridColumnWidths,
  writeSheetGridPrefs,
} from "./sheet-grid-prefs";

function createStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("reconcileSheetGridPrefs", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorage());
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prunes invalid hidden indices and resets on header change", () => {
    reconcileSheetGridPrefs("sh_test", ["Platform", "Category"], [["a", "b"]]);
    writeSheetGridPrefs("sh_test", { hidden: [0, 2], widths: {}, wrap: false });
    reconcileSheetGridPrefs("sh_test", ["Platform", "Category"], [["a", "b"]]);
    expect(readSheetGridPrefs("sh_test").hidden).toEqual([]);

    writeSheetGridPrefs("sh_test", { hidden: [1], widths: {}, wrap: false });
    const next = reconcileSheetGridPrefs("sh_test", ["Platform", "Category", "Question"], [["a", "b", "c"]]);
    expect(next.hidden).toEqual([]);
  });

  it("auto-hides unnamed empty columns on first load and seeds role widths", () => {
    const header = ["A", "B", "", "D", "", "F", "G", ""];
    const rows = [["1", "2", "", "4", "", "6", "7", ""]];
    const next = reconcileSheetGridPrefs("sh_wide", header, rows);
    expect(next.hidden).toEqual([2, 4, 7]);
    expect(next.columnFit).toBe("weighted");
    expect(Object.keys(next.widths).length).toBe(header.length);
  });

  it("resetSheetGridColumnWidths clears widths and restores equal fit", () => {
    writeSheetGridPrefs("sh_reset", {
      hidden: [],
      widths: { "0": 200, "1": 300 },
      wrap: false,
      columnFit: "weighted",
    });
    const next = resetSheetGridColumnWidths("sh_reset");
    expect(next.widths).toEqual({});
    expect(next.columnFit).toBe("equal");
  });
});
