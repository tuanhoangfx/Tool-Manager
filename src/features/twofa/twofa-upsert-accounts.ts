import { newId } from "./storage";
import type { TwofaAccount, TwofaDraft } from "./types";
import { normalizeSecret } from "./totp";
import { twofaIdentityKey } from "./twofa-identity";

export type TwofaUpsertOutcome = {
  accounts: TwofaAccount[];
  row: TwofaAccount;
  replaced: boolean;
  removedIds: string[];
};

function draftToFields(draft: TwofaDraft) {
  const service = draft.service.trim();
  const browser = draft.browser?.trim();
  const account = draft.account.trim();
  const secret = normalizeSecret(draft.secret);
  const password = draft.password?.trim();
  return { service, browser, account, secret, password };
}

/** Upsert one draft: replace existing same identity (delete older duplicates), or append new row. */
export function upsertTwofaDraft(
  prev: TwofaAccount[],
  draft: TwofaDraft,
  now: string,
): TwofaUpsertOutcome | null {
  const { service, browser, account, secret, password } = draftToFields(draft);
  if (!secret) return null;

  const key = twofaIdentityKey(service, account, secret, browser);
  const matches = prev.filter(
    (row) => twofaIdentityKey(row.service, row.account, row.secret, row.browser) === key,
  );

  if (matches.length > 0) {
    const keeper = matches.reduce((best, row) =>
      Date.parse(row.updatedAt) >= Date.parse(best.updatedAt) ? row : best,
    );
    const removedIds = matches.filter((row) => row.id !== keeper.id).map((row) => row.id);
    const updated: TwofaAccount = {
      ...keeper,
      service,
      account,
      secret,
      updatedAt: now,
      ...(browser ? { browser } : {}),
      ...(password ? { password } : {}),
    };
    if (!browser) delete updated.browser;
    if (!password) delete updated.password;

    const accounts = prev
      .filter((row) => !matches.some((m) => m.id === row.id))
      .concat([updated]);
    return { accounts, row: updated, replaced: true, removedIds };
  }

  const row: TwofaAccount = {
    id: newId(),
    service,
    ...(browser ? { browser } : {}),
    account,
    ...(password ? { password } : {}),
    secret,
    createdAt: now,
    updatedAt: now,
  };
  return { accounts: [...prev, row], row, replaced: false, removedIds: [] };
}

/** Update an existing row by id; remove other rows that share the new identity. */
export function updateTwofaDraft(
  prev: TwofaAccount[],
  id: string,
  draft: TwofaDraft,
  now: string,
): TwofaUpsertOutcome | null {
  const { service, browser, account, secret, password } = draftToFields(draft);
  if (!secret) return null;

  const current = prev.find((row) => row.id === id);
  if (!current) return null;

  const key = twofaIdentityKey(service, account, secret, browser);
  const duplicates = prev.filter(
    (row) =>
      row.id !== id && twofaIdentityKey(row.service, row.account, row.secret, row.browser) === key,
  );
  const updated: TwofaAccount = {
    ...current,
    service,
    account,
    secret,
    updatedAt: now,
    ...(browser ? { browser } : {}),
    ...(password ? { password } : {}),
  };
  if (!browser) delete updated.browser;
  if (!password) delete updated.password;

  const accounts = prev
    .filter((row) => row.id === id || !duplicates.some((d) => d.id === row.id))
    .map((row) => (row.id === id ? updated : row));

  return {
    accounts,
    row: updated,
    replaced: duplicates.length > 0,
    removedIds: duplicates.map((row) => row.id),
  };
}

/** Find another row that shares the draft identity (for edit conflict checks). */
export function findTwofaDraftConflict(
  accounts: TwofaAccount[],
  draft: TwofaDraft,
  excludeId?: string,
): TwofaAccount | null {
  const { service, browser, account, secret } = draftToFields(draft);
  if (!secret) return null;
  const key = twofaIdentityKey(service, account, secret, browser);
  const match = accounts.find(
    (row) =>
      row.id !== excludeId &&
      twofaIdentityKey(row.service, row.account, row.secret, row.browser) === key,
  );
  return match ?? null;
}

export type TwofaDedupeResult = {
  accounts: TwofaAccount[];
  removedIds: string[];
};

/** Collapse duplicate identities in an account list — keep newest updatedAt per key. */
export function dedupeTwofaAccounts(accounts: TwofaAccount[]): TwofaDedupeResult {
  const groups = new Map<string, TwofaAccount[]>();
  for (const row of accounts) {
    const key = twofaIdentityKey(row.service, row.account, row.secret, row.browser);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const kept: TwofaAccount[] = [];
  const removedIds: string[] = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      kept.push(group[0]!);
      continue;
    }
    const winner = group.reduce((best, row) =>
      Date.parse(row.updatedAt) >= Date.parse(best.updatedAt) ? row : best,
    );
    kept.push(winner);
    for (const row of group) {
      if (row.id !== winner.id) removedIds.push(row.id);
    }
  }

  kept.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.service.localeCompare(b.service),
  );
  return { accounts: kept, removedIds };
}
