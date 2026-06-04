import { describe, expect, it } from "vitest";
import { lookupVaultRow, mapVaultRows, vaultRouteKey } from "./cookieVaultRepository";

describe("vaultRouteKey", () => {
  it("normalizes domain to .host", () => {
    expect(vaultRouteKey("abc", "kalodata.com")).toBe("abc:.kalodata.com");
    expect(vaultRouteKey("abc", ".kalodata.com")).toBe("abc:.kalodata.com");
  });
});

describe("lookupVaultRow", () => {
  it("finds row when map uses normalized key", () => {
    const map = mapVaultRows([
      {
        note_id: "n1",
        domain: "kalodata.com",
        cookie_count: 3,
        updated_at: "2026-06-04T14:57:00Z",
        source_browser: null,
        updated_by: null,
      },
    ]);
    const row = lookupVaultRow(map, "n1", ".kalodata.com");
    expect(row?.updated_at).toBe("2026-06-04T14:57:00Z");
  });

  it("does not cross-match different notes on same domain", () => {
    const map = mapVaultRows([
      {
        note_id: "n1",
        domain: ".kalodata.com",
        cookie_count: 1,
        updated_at: "2026-06-04T14:57:00Z",
        source_browser: null,
        updated_by: null,
      },
      {
        note_id: "n2",
        domain: ".kalodata.com",
        cookie_count: 2,
        updated_at: "2026-06-04T15:12:00Z",
        source_browser: null,
        updated_by: null,
      },
    ]);
    expect(lookupVaultRow(map, "n1", ".kalodata.com")?.updated_at).toBe("2026-06-04T14:57:00Z");
    expect(lookupVaultRow(map, "n2", ".kalodata.com")?.updated_at).toBe("2026-06-04T15:12:00Z");
  });
});
