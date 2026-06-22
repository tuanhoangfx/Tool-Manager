import { isTwofaCloudAvailable, dedupeTwofaCloudByIdentity, reconcileTwofaWithCloud } from "./twofa-cloud-sync";
import { dedupeTwofaAccounts } from "./twofa-upsert-accounts";
import { filterTwofaPendingDeletes } from "./twofa-sync-pending";
import type { TwofaAccount } from "./types";

export const TWOFA_VAULT_DEDUPE_MIGRATION_KEY = "p0020-twofa-vault-dedupe-migration-v1";
export const TWOFA_VAULT_CLOUD_ALIGN_KEY = "p0020-twofa-vault-cloud-align-v1";

function migrationStorageKey(userId: string | null | undefined): string {
  return userId ? `${TWOFA_VAULT_DEDUPE_MIGRATION_KEY}:${userId}` : TWOFA_VAULT_DEDUPE_MIGRATION_KEY;
}

export function isTwofaVaultDedupeMigrationDone(userId: string | null | undefined): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(migrationStorageKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function markTwofaVaultDedupeMigrationDone(userId: string | null | undefined): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(migrationStorageKey(userId), "1");
  } catch {
    /* ignore */
  }
}

function cloudAlignStorageKey(userId: string | null | undefined): string {
  return userId ? `${TWOFA_VAULT_CLOUD_ALIGN_KEY}:${userId}` : TWOFA_VAULT_CLOUD_ALIGN_KEY;
}

export function isTwofaVaultCloudAlignDone(userId: string | null | undefined): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    return localStorage.getItem(cloudAlignStorageKey(userId)) === "1";
  } catch {
    return true;
  }
}

export function markTwofaVaultCloudAlignDone(userId: string | null | undefined): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(cloudAlignStorageKey(userId), "1");
  } catch {
    /* ignore */
  }
}

export type TwofaVaultDedupeMigrationDeps = {
  userId: string | null;
  getLocal: () => TwofaAccount[];
  applyAccounts: (next: TwofaAccount[], opts?: { skipBroadcast?: boolean }) => void;
  cloudDelete: (id: string) => Promise<void>;
  syncFromCloud: (opts?: { silent?: boolean; full?: boolean; reconcile?: boolean }) => Promise<void>;
};

/** Replace local cache with cloud snapshot — drops local-only ghosts (e.g. orphan Capcut rows). */
export async function runTwofaVaultCloudAlignMigration(
  deps: TwofaVaultDedupeMigrationDeps,
): Promise<number> {
  if (!isTwofaCloudAvailable()) {
    markTwofaVaultCloudAlignDone(deps.userId);
    return 0;
  }
  const localCount = deps.getLocal().length;
  const pulled = await reconcileTwofaWithCloud([], { cloudOnly: true });
  if (pulled.error) return 0;
  const { accounts } = dedupeTwofaAccounts(filterTwofaPendingDeletes(pulled.accounts));
  deps.applyAccounts(accounts, { skipBroadcast: true });
  markTwofaVaultCloudAlignDone(deps.userId);
  markTwofaVaultDedupeMigrationDone(deps.userId);
  return Math.max(0, localCount - accounts.length);
}

/** One-shot local + cloud dedupe for legacy ghost rows (Capcut secret/no-secret split). */
export async function runTwofaVaultDedupeMigration(
  deps: TwofaVaultDedupeMigrationDeps,
): Promise<number> {
  let removed = 0;

  if (isTwofaCloudAvailable()) {
    const { removed: cloudRemoved, error } = await dedupeTwofaCloudByIdentity();
    if (!error) removed += cloudRemoved;
  }

  const { accounts: deduped, removedIds } = dedupeTwofaAccounts(deps.getLocal());
  if (removedIds.length) {
    deps.applyAccounts(deduped, { skipBroadcast: true });
    for (const id of removedIds) await deps.cloudDelete(id);
    removed += removedIds.length;
  }

  markTwofaVaultDedupeMigrationDone(deps.userId);

  if (removed > 0 && isTwofaCloudAvailable()) {
    await deps.syncFromCloud({ silent: true, full: true });
  }

  return removed;
}
