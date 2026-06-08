import { describe, expect, it } from "vitest";
import { hubRouteAccessFilterDefs } from "@tool-workspace/hub-ui";
import { ACCESS_FILTER_DEFS, accessFiltersWithCounts } from "./access-filter-counts";
import type { RouteAccessRow } from "./CookieRouteAccessTable";

const rows: RouteAccessRow[] = [
  {
    id: "owner",
    user: "owner@x.com",
    role: "Owner",
    canApply: true,
    canPublish: true,
    expiresAt: null,
    member: null,
    selectable: false,
  },
  {
    id: "m1",
    user: "cs00761@infix1.io.vn",
    role: "Load",
    canApply: true,
    canPublish: false,
    expiresAt: null,
    member: null,
    selectable: true,
  },
];

describe("access-filter-counts", () => {
  it("single-route defs omit publish/status filter", () => {
    expect(ACCESS_FILTER_DEFS).toEqual(hubRouteAccessFilterDefs("single-route"));
    expect(ACCESS_FILTER_DEFS.some((d) => d.key === "status")).toBe(false);
  });

  it("counts load members in role facet", () => {
    const defs = accessFiltersWithCounts(rows, "", {});
    const roleDef = defs.find((d) => d.key === "role");
    expect(roleDef?.options.find((o) => o.value === "load")?.count).toBe(1);
    expect(roleDef?.options.find((o) => o.value === "owner")?.count).toBe(1);
  });
});
