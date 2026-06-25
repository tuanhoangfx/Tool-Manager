import { describe, expect, it } from "vitest";
import { twofaFiltersWithCounts } from "./twofa-filter-counts";
import type { TwofaAccount } from "./types";

function row(
  service: string,
  id = service,
  status: TwofaAccount["status"] = "active",
): TwofaAccount {
  return {
    id,
    service,
    account: "user@example.com",
    secret: "ABCDEFGHIJKLMNOP",
    status,
    ownership: "undefined",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function periodAll() {
  return { range: "all" as const, customMonth: "", customStartDate: "", customEndDate: "" };
}

describe("twofaFiltersWithCounts", () => {
  it("lists service options with counts for large vaults", () => {
    const accounts = [row("CapCut", "1"), row("ChatGPT", "2"), row("Cursor", "3")];
    const padded = Array.from({ length: 2_001 }, (_, i) => row(`Svc${i}`, String(i)));
    const all = [...accounts, ...padded];
    const defs = twofaFiltersWithCounts(all, "", {}, periodAll(), "services");
    const service = defs.find((d) => d.key === "service");
    expect(service?.options.map((o) => o.value)).toEqual(expect.arrayContaining(["CapCut", "ChatGPT", "Cursor"]));
    expect(service?.totalCount).toBe(all.length);
    expect(service?.options.find((o) => o.value === "ChatGPT")?.count).toBe(1);
  });

  it("facets status counts within search query", () => {
    const accounts = [
      row("ChatGPT", "1", "active"),
      row("ChatGPT", "2", "disable"),
      row("ChatGPT", "3", "active"),
      row("Cursor", "4", "error"),
    ];
    const defs = twofaFiltersWithCounts(accounts, "ChatGPT", {}, periodAll(), "services");
    const status = defs.find((d) => d.key === "status");
    expect(status?.totalCount).toBe(3);
    expect(status?.options.find((o) => o.value === "active")?.count).toBe(2);
    expect(status?.options.find((o) => o.value === "disable")?.count).toBe(1);
    expect(status?.options.find((o) => o.value === "error")?.count).toBe(0);
  });

  it("shows per-option counts on usage filter", () => {
    const now = Date.now();
    const accounts: TwofaAccount[] = [
      { ...row("A", "1"), lastUsedAt: new Date(now - 86400000).toISOString() },
      { ...row("B", "2") },
    ];
    const defs = twofaFiltersWithCounts(accounts, "", {}, periodAll(), "services");
    const usage = defs.find((d) => d.key === "usage");
    expect(usage?.options.find((o) => o.value === "recent")?.count).toBe(1);
    expect(usage?.options.find((o) => o.value === "never")?.count).toBe(1);
  });
});
