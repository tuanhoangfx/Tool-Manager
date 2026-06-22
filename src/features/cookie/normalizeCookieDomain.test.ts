import { describe, expect, it } from "vitest";
import { deprecatedCookieRouteDomainHint, normalizeCookieDomain } from "./normalizeCookieDomain";

describe("normalizeCookieDomain", () => {
  it("normalizes URLs and strips www", () => {
    expect(normalizeCookieDomain("https://www.facebook.com/profile")).toBe(".facebook.com");
    expect(normalizeCookieDomain("http://supabase.co/dashboard")).toBe(".supabase.co");
  });

  it("rejects blank or single-label hosts", () => {
    expect(normalizeCookieDomain("")).toBeNull();
    expect(normalizeCookieDomain("localhost")).toBeNull();
  });

  it("canonicalizes Google subdomains to .google.com", () => {
    expect(normalizeCookieDomain(".mail.google.com")).toBe(".google.com");
    expect(normalizeCookieDomain("https://mail.google.com/mail/u/0/")).toBe(".google.com");
    expect(normalizeCookieDomain(".google.com")).toBe(".google.com");
  });

  it("hints when mail.google.com route is normalized", () => {
    expect(deprecatedCookieRouteDomainHint(".mail.google.com")).toMatch(/\.google\.com/);
    expect(deprecatedCookieRouteDomainHint(".facebook.com")).toBeNull();
  });
});
