import { describe, expect, it } from "vitest";
import {
  buildShareUrl,
  canonicalPublicSharePath,
  isPublicShareEntry,
  isPublicShareLinkSearch,
} from "./shareUtils";

describe("isPublicShareEntry", () => {
  it("detects /share path", () => {
    expect(isPublicShareEntry("/share", "?token=abc")).toBe(true);
  });

  it("detects legacy /notes?token=", () => {
    expect(isPublicShareEntry("/notes", "?token=abc")).toBe(true);
  });

  it("detects ?screen=share", () => {
    expect(isPublicShareEntry("/", "?screen=share&token=abc")).toBe(true);
  });

  it("ignores owner note deep links", () => {
    expect(isPublicShareEntry("/notes", "?note=uuid&token=abc")).toBe(false);
  });
});

describe("isPublicShareLinkSearch", () => {
  it("delegates to isPublicShareEntry", () => {
    expect(isPublicShareLinkSearch("?token=abc")).toBe(true);
  });
});

describe("canonicalPublicSharePath", () => {
  it("uses /share path", () => {
    expect(canonicalPublicSharePath("tok")).toBe("/share?token=tok");
  });
});

describe("buildShareUrl", () => {
  it("uses production databox host and /share path", () => {
    const url = buildShareUrl("abc123");
    expect(url).toBe("https://databox.infi.io.vn/share?token=abc123");
  });

  it("encodes token characters", () => {
    const url = buildShareUrl("a+b/c");
    expect(url).toBe("https://databox.infi.io.vn/share?token=a%2Bb%2Fc");
  });
});
