import { describe, expect, it } from "vitest";
import {
  folderFilterButtonLabel,
  multiFilterTriggerTitle,
} from "../../vendor/hub-ui/src/shell/filter-dropdown-primitives";

const opts = [
  { value: "a", label: "Agc" },
  { value: "b", label: "Promt" },
  { value: "c", label: "Work" },
];

describe("folderFilterButtonLabel", () => {
  it("shows All {label} when nothing selected", () => {
    expect(folderFilterButtonLabel("Folder", 0, undefined, true)).toBe("All Folder");
  });

  it("shows sole folder name without prefix when one selected", () => {
    expect(folderFilterButtonLabel("Folder", 1, "Agc", true)).toBe("Agc");
  });

  it("shows count summary without prefix or duplicate badge text", () => {
    expect(folderFilterButtonLabel("Folder", 2, undefined, true)).toBe("2 selected");
  });
});

describe("multiFilterTriggerTitle", () => {
  it("lists selected option labels for multi-select hover", () => {
    expect(multiFilterTriggerTitle(["a", "b"], opts)).toBe("Agc, Promt");
  });

  it("returns undefined for zero or one selection", () => {
    expect(multiFilterTriggerTitle([], opts)).toBeUndefined();
    expect(multiFilterTriggerTitle(["a"], opts)).toBeUndefined();
  });
});
