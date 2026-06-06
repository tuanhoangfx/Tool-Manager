import { describe, expect, it } from "vitest";
import { buildCookiePlatformOptions, routePlatformKey } from "./cookie-route-platform";
import type { CookieRouteRow } from "./cookie-route-filter-counts";

function row(domain: string): CookieRouteRow {
  return {
    binding: {
      id: "1",
      noteId: "n1",
      domain,
      enabled: true,
      syncId: "TM-1",
      noteTitle: "Test",
    },
  };
}

describe("routePlatformKey", () => {
  it("maps kalodata domain to kalodata slug", () => {
    expect(routePlatformKey(".kalodata.com")).toBe("kalodata");
  });

  it("maps unknown domain to other", () => {
    expect(routePlatformKey(".example.org")).toBe("other");
  });
});

describe("buildCookiePlatformOptions", () => {
  it("includes brand iconSrc for known platforms", () => {
    const options = buildCookiePlatformOptions([row(".kalodata.com"), row(".facebook.com")]);
    const kalodata = options.find((o) => o.value === "kalodata");
    expect(kalodata?.label).toBe("Kalodata");
    expect(kalodata?.iconSrc).toContain("kalodata");
  });
});
