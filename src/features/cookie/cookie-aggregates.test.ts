import { describe, expect, it } from "vitest";
import { buildCookieChartItems } from "./cookie-aggregates";
import type { CookieRouteRow } from "./cookie-route-filter-counts";

function row(
  domain: string,
  status = "pending",
  role?: string,
  locked = false,
  noteId = "n1",
): CookieRouteRow {
  return {
    binding: {
      id: domain,
      noteId,
      domain,
      enabled: true,
      syncId: "TM-1",
      noteTitle: "Test",
      sourceBrowserId: locked ? "browser-1" : undefined,
      accessRole: role as "owner" | "member" | undefined,
    },
    note: { sync_status: status } as CookieRouteRow["note"],
  };
}

describe("buildCookieChartItems", () => {
  it("labels sync status for humans", () => {
    const charts = buildCookieChartItems(
      [row(".kalodata.com", "synced"), row(".facebook.com", "pending")],
      {},
    );
    expect(charts.statusItems.map((item) => item.label)).toEqual(["Synced", "Awaiting sync"]);
  });

  it("groups routes by platform label", () => {
    const charts = buildCookieChartItems(
      [row(".kalodata.com"), row(".facebook.com"), row(".kalodata.com")],
      {},
    );
    const kalodata = charts.platformItems.find((item) => item.label === "Kalodata");
    const facebook = charts.platformItems.find((item) => item.label === "Facebook");
    expect(kalodata?.value).toBe(2);
    expect(facebook?.value).toBe(1);
  });

  it("sums vault cookies per platform", () => {
    const vaultByKey = { "n1:.kalodata.com": { cookie_count: 32 } as never };
    const charts = buildCookieChartItems([row(".kalodata.com")], vaultByKey);
    expect(charts.cookieItems[0]).toMatchObject({ label: "Kalodata", value: 32 });
  });

  it("splits route access into owner, locked, member", () => {
    const charts = buildCookieChartItems(
      [row(".a.com"), row(".b.com", "pending", undefined, true), row(".c.com", "pending", "member")],
      {},
    );
    expect(charts.accessItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Owner", value: 1 }),
        expect.objectContaining({ label: "Locked browser", value: 1 }),
        expect.objectContaining({ label: "Member", value: 1 }),
      ]),
    );
  });

  it("splits route sharing into private, shared out, and shared to me", () => {
    const charts = buildCookieChartItems(
      [
        row(".a.com", "pending", undefined, false, "n-private"),
        row(".b.com", "pending", undefined, false, "n-shared"),
        row(".c.com", "pending", "member", false, "n-member"),
      ],
      {},
      { "n-shared": 2 },
    );
    expect(charts.shareItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Private", value: 1 }),
        expect.objectContaining({ label: "Shared", value: 1 }),
        expect.objectContaining({ label: "Shared to me", value: 1 }),
      ]),
    );
  });
});
