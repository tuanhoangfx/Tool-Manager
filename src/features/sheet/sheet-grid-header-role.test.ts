import { describe, expect, it } from "vitest";
import { resolveSheetGridHeaderRole } from "./sheet-grid-header-role";

describe("resolveSheetGridHeaderRole", () => {
  it("maps known sheet column labels", () => {
    expect(resolveSheetGridHeaderRole("Category")).toBe("category");
    expect(resolveSheetGridHeaderRole("Platform")).toBe("scope");
    expect(resolveSheetGridHeaderRole("Hyperlink")).toBe("url");
    expect(resolveSheetGridHeaderRole("Feature")).toBe("tools");
    expect(resolveSheetGridHeaderRole("Question")).toBe("notes");
  });

  it("falls back to name for unknown labels", () => {
    expect(resolveSheetGridHeaderRole("Custom Col")).toBe("name");
  });
});
