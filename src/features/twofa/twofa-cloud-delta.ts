import type { TwofaAccount } from "./types";
import { normalizeTwofaAccountStatus } from "./twofa-account-status";
import { normalizeTwofaLog } from "./twofa-account-log";

export type TwofaDbRow = {
  id: string;
  service: string;
  browser: string | null;
  account: string;
  password: string | null;
  secret: string;
  note: string | null;
  status: string | null;
  log: unknown;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
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
    ...(row.password?.trim() ? { password: row.password.trim() } : {}),
    secret: row.secret ?? "",
    status: normalizeTwofaAccountStatus(row.status),
    ...(note ? { note } : {}),
    ...(log.length ? { log } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.last_used_at ? { lastUsedAt: row.last_used_at } : {}),
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
