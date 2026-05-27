import { describe, expect, it } from "vitest";
import { normalizeCookieDomain } from "./normalizeCookieDomain";

describe("normalizeCookieDomain", () => {
  it("normalizes URLs and strips www", () => {
    expect(normalizeCookieDomain("https://www.facebook.com/profile")).toBe(".facebook.com");
    expect(normalizeCookieDomain("http://supabase.co/dashboard")).toBe(".supabase.co");
  });

  it("rejects blank or single-label hosts", () => {
    expect(normalizeCookieDomain("")).toBeNull();
    expect(normalizeCookieDomain("localhost")).toBeNull();
  });
});
