import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TwofaAccount } from "./types";
import {
  isTwofaVaultDedupeMigrationDone,
  markTwofaVaultDedupeMigrationDone,
  runTwofaVaultDedupeMigration,
  TWOFA_VAULT_DEDUPE_MIGRATION_KEY,
} from "./twofa-vault-dedupe-migration";

vi.mock("./twofa-cloud-sync", () => ({
  isTwofaCloudAvailable: () => false,
  dedupeTwofaCloudByIdentity: vi.fn(),
}));

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function row(id: string, secret: string, updatedAt: string): TwofaAccount {
  return {
    id,
    service: "Capcut",
    account: "user@test.com",
    secret,
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt,
  };
}

describe("twofa-vault-dedupe-migration", () => {
  it("marks migration done per user", () => {
    const uid = "user-abc";
    expect(isTwofaVaultDedupeMigrationDone(uid)).toBe(false);
    markTwofaVaultDedupeMigrationDone(uid);
    expect(localStorage.getItem(`${TWOFA_VAULT_DEDUPE_MIGRATION_KEY}:${uid}`)).toBe("1");
    expect(isTwofaVaultDedupeMigrationDone(uid)).toBe(true);
  });

  it("removes local vault ghost and marks migration complete", async () => {
    const uid = "user-dedupe";
    const local = [
      row("ghost", "JBSWY3DPEHPK3PXP", "2026-06-01T00:00:00.000Z"),
      row("keeper", "", "2026-06-09T00:00:00.000Z"),
    ];
    let current = [...local];
    const cloudDelete = vi.fn(async () => {});
    const applyAccounts = vi.fn((next: TwofaAccount[]) => {
      current = next;
    });
    const syncFromCloud = vi.fn(async () => {});

    const removed = await runTwofaVaultDedupeMigration({
      userId: uid,
      getLocal: () => current,
      applyAccounts,
      cloudDelete,
      syncFromCloud,
    });

    expect(removed).toBe(1);
    expect(current).toHaveLength(1);
    expect(current[0]?.id).toBe("keeper");
    expect(cloudDelete).toHaveBeenCalledWith("ghost");
    expect(isTwofaVaultDedupeMigrationDone(uid)).toBe(true);
  });
});
