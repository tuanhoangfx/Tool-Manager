import { describe, expect, it } from "vitest";
import {
  resolveTwofaDirectoryPageSize,
  TWOFA_LARGE_DIRECTORY_MAX_PAGE,
  TWOFA_LARGE_DIRECTORY_THRESHOLD,
} from "./twofa-directory-page-size";

describe("twofa-directory-page-size", () => {
  it("passes through user page size for small directories", () => {
    expect(resolveTwofaDirectoryPageSize(TWOFA_LARGE_DIRECTORY_THRESHOLD, 100)).toBe(100);
  });

  it("caps page size for large directories", () => {
    expect(resolveTwofaDirectoryPageSize(TWOFA_LARGE_DIRECTORY_THRESHOLD + 1, 100)).toBe(
      TWOFA_LARGE_DIRECTORY_MAX_PAGE,
    );
  });
});
