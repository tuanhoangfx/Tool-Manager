import type { TwofaAccount } from "./types";
import { normalizeTwofaAccountStatus } from "./twofa-account-status";
import {
  normalizeTwofaAccountOwnership,
  resolveTwofaAccountOwnership,
} from "./twofa-account-ownership";
import { normalizeTwofaLog } from "./twofa-account-log";

export type TwofaDbRow = {
  id: string;
  service: string;
  browser: string | null;
  account: string;
  mail_recover: string | null;
  password: string | null;
  secret: string;
  note: string | null;
  status: string | null;
  ownership: string | null;
  log: unknown;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  plan_package: string | null;
  plan_status: string | null;
  plan_tier: string | null;
  plan_expires_at: string | null;
  quota_snapshot: unknown;
  quota_checked_at: string | null;
  quota_status: string | null;
  quota_enrolled_at?: string | null;
  deleted_at: string | null;
};

export function twofaDbRowToAccount(row: TwofaDbRow): TwofaAccount {
  const note = row.note?.trim();
  const log = normalizeTwofaLog(row.log);
  return {
    id: row.id,
    service: row.service,
    ...(row.browser?.trim() ? { browser: row.browser.trim() } : {}),
    account: row.account,
    ...(row.mail_recover?.trim() ? { mailRecover: row.mail_recover.trim() } : {}),
    ...(row.password?.trim() ? { password: row.password.trim() } : {}),
    secret: row.secret ?? "",
    status: normalizeTwofaAccountStatus(row.status),
    ownership: resolveTwofaAccountOwnership(row.ownership, row.note ?? undefined),
    ...(note ? { note } : {}),
    ...(log.length ? { log } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.last_used_at ? { lastUsedAt: row.last_used_at } : {}),
    ...(row.plan_package?.trim() ? { planPackage: row.plan_package.trim() } : {}),
    ...(row.plan_status?.trim() ? { planStatus: row.plan_status.trim() } : {}),
    ...(row.plan_tier?.trim() ? { planTier: row.plan_tier.trim() } : {}),
    ...(row.plan_expires_at ? { planExpiresAt: row.plan_expires_at } : {}),
    ...(row.quota_snapshot ? { quotaSnapshot: row.quota_snapshot as TwofaAccount["quotaSnapshot"] } : {}),
    ...(row.quota_checked_at ? { quotaCheckedAt: row.quota_checked_at } : {}),
    ...(row.quota_status?.trim() ? { quotaStatus: row.quota_status.trim() } : {}),
    ...(row.quota_enrolled_at ? { quotaEnrolledAt: row.quota_enrolled_at } : {}),
  };
}

export type MergeAccountsOpts = { /** When timestamps tie, incoming row wins (use for local-over-remote reconcile). */ incomingWinsOnTie?: boolean };

export function mergeAccounts(
  base: TwofaAccount[],
  incoming: TwofaAccount[],
  opts?: MergeAccountsOpts,
): TwofaAccount[] {
  const incomingWinsOnTie = opts?.incomingWinsOnTie ?? false;
  const byId = new Map<string, TwofaAccount>();
  for (const row of base) byId.set(row.id, row);
  for (const row of incoming) {
    const prev = byId.get(row.id);
    const incomingAt = Date.parse(row.updatedAt);
    const prevAt = prev ? Date.parse(prev.updatedAt) : Number.NEGATIVE_INFINITY;
    const incomingWins =
      !prev || incomingAt > prevAt || (incomingWinsOnTie && incomingAt === prevAt);
    if (incomingWins) byId.set(row.id, row);
  }
  return [...byId.values()].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.service.localeCompare(b.service),
  );
}

/** Apply paginated cloud delta — tombstones remove local rows; active rows merge by updated_at. */
export function applyTwofaCloudDelta(
  local: TwofaAccount[],
  changedRows: TwofaDbRow[],
): { accounts: TwofaAccount[]; maxUpdated: string } {
  const tombstoneIds = new Set<string>();
  const activeRemote: TwofaAccount[] = [];
  let maxUpdated = "";

  for (const row of changedRows) {
    if (row.updated_at > maxUpdated) maxUpdated = row.updated_at;
    if (row.deleted_at) {
      tombstoneIds.add(row.id);
      continue;
    }
    activeRemote.push(twofaDbRowToAccount(row));
  }

  let accounts = tombstoneIds.size ? local.filter((row) => !tombstoneIds.has(row.id)) : local;
  if (activeRemote.length) accounts = mergeAccounts(accounts, activeRemote);
  return { accounts, maxUpdated };
}
