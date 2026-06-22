import { describe, expect, it } from "vitest";
import {
  appendTwofaLog,
  backfillTwofaAccountLog,
  buildTwofaUpdateLogChanges,
  buildTwofaUpdateLogMessage,
  withTwofaCreateLog,
  withTwofaUpdateLog,
} from "./twofa-account-log";
import type { TwofaAccount } from "./types";

const BASE: TwofaAccount = {
  id: "a",
  service: "Google",
  account: "user@gmail.com",
  secret: "JBSWY3DPEHPK3PXP",
  status: "active",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("twofa-account-log", () => {
  it("appends create log entry", () => {
    const row = withTwofaCreateLog(BASE, "2026-06-07T00:00:00.000Z");
    expect(row.log).toHaveLength(1);
    expect(row.log?.[0]?.message).toBe("Account created");
  });

  it("stores structured changes on update", () => {
    const row = withTwofaUpdateLog(
      BASE,
      { ...BASE, secret: "", updatedAt: "2026-06-08T00:00:00.000Z" },
      "2026-06-08T00:00:00.000Z",
    );
    const entry = row.log?.[row.log.length - 1];
    expect(entry?.changes?.some((change) => change.field === "secret")).toBe(true);
    expect(entry?.message).toContain("Secret:");
  });

  it("builds structured secret removal change", () => {
    const changes = buildTwofaUpdateLogChanges(BASE, { ...BASE, secret: "" });
    expect(changes).toEqual([
      expect.objectContaining({ field: "secret", before: expect.any(String), after: "—" }),
    ]);
  });

  it("caps log history length", () => {
    let log = appendTwofaLog(undefined, "first", "2026-06-01T00:00:00.000Z");
    for (let i = 0; i < 100; i++) {
      log = appendTwofaLog(log, `change-${i}`, `2026-06-01T00:00:${String(i).padStart(2, "0")}.000Z`);
    }
    expect(log.length).toBeLessThanOrEqual(80);
  });

  it("backfills import log for legacy rows", () => {
    const row = backfillTwofaAccountLog({ ...BASE, log: undefined });
    expect(row.log?.[0]).toEqual({ at: BASE.createdAt, message: "Account imported" });
  });

  it("backfills last update when updatedAt differs from createdAt", () => {
    const row = backfillTwofaAccountLog({
      ...BASE,
      updatedAt: "2026-06-02T00:00:00.000Z",
    });
    expect(row.log).toHaveLength(2);
    expect(row.log?.[1]).toEqual({ at: "2026-06-02T00:00:00.000Z", message: "Account updated" });
  });
});
