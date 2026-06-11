import { describe, expect, it } from "vitest";
import { parseCookieListSort, readCookieViewMode } from "./cookie-list-prefs";

describe("readCookieViewMode", () => {
  it("defaults to card when cview is absent", () => {
    expect(readCookieViewMode()).toBe("card");
  });
});

describe("parseCookieListSort", () => {
  it("falls back to updated for unknown sort", () => {
    expect(parseCookieListSort("unknown")).toBe("updated");
  });
});
