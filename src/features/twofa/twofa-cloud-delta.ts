import type { TwofaAccount } from "./types";

export type TwofaDbRow = {
  id: string;
  service: string;
  browser: string | null;
  account: string;
  password: string | null;
  secret: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  deleted_at: string | null;
};

export function twofaDbRowToAccount(row: TwofaDbRow): TwofaAccount {
  return {
    id: row.id,
    service: row.service,
    ...(row.browser?.trim() ? { browser: row.browser.trim() } : {}),
    account: row.account,
    ...(row.password?.trim() ? { password: row.password.trim() } : {}),
    secret: row.secret,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.last_used_at ? { lastUsedAt: row.last_used_at } : {}),
  };
}

function mergeAccounts(local: TwofaAccount[], remote: TwofaAccount[]): TwofaAccount[] {
  const byId = new Map<string, TwofaAccount>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const prev = byId.get(row.id);
    if (!prev || Date.parse(row.updatedAt) >= Date.parse(prev.updatedAt)) {
      byId.set(row.id, row);
    }
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
