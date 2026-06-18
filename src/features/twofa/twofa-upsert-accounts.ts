import { newId } from "./storage";
import type { TwofaAccount, TwofaDraft } from "./types";
import { normalizeSecret } from "./totp";
import { twofaDedupeKey, twofaIdentityKey } from "./twofa-identity";

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

export type TwofaDedupeServiceCount = {
  service: string;
  count: number;
};

export type TwofaDedupeGroup = {
  key: string;
  keptId: string;
  kept: TwofaAccount;
  removed: TwofaAccount[];
};

export type TwofaDedupePreview = {
  totalRemoved: number;
  byService: TwofaDedupeServiceCount[];
  /** Sample groups for UI preview. Sorted by removed count desc, then newest. */
  groups: TwofaDedupeGroup[];
};

function buildTwofaDedupePreview(accounts: TwofaAccount[]): TwofaDedupePreview {
  const groups = new Map<string, TwofaAccount[]>();
  for (const row of accounts) {
    const key = twofaDedupeKey(row.service, row.account, row.secret, row.browser);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const removedIds = new Set<string>();
  const byServiceMap = new Map<string, number>();
  const previewGroups: TwofaDedupeGroup[] = [];

  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) continue;
    const winner = group.reduce((best, row) =>
      Date.parse(row.updatedAt) >= Date.parse(best.updatedAt) ? row : best,
    );
    const removed = group.filter((row) => row.id !== winner.id);
    previewGroups.push({ key, keptId: winner.id, kept: winner, removed });
    for (const row of removed) {
      removedIds.add(row.id);
      const svc = row.service.trim() || "Others";
      byServiceMap.set(svc, (byServiceMap.get(svc) ?? 0) + 1);
    }
  }

  previewGroups.sort((a, b) => {
    const byCount = b.removed.length - a.removed.length;
    if (byCount) return byCount;
    return Date.parse(b.kept.updatedAt) - Date.parse(a.kept.updatedAt);
  });

  const byService = [...byServiceMap.entries()]
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count || a.service.localeCompare(b.service));

  return { totalRemoved: removedIds.size, byService, groups: previewGroups.slice(0, 24) };
}

/** Preview duplicate removal counts by service — no mutation. */
export function previewTwofaDedupe(accounts: TwofaAccount[]): TwofaDedupePreview {
  return buildTwofaDedupePreview(accounts);
}

/** Collapse duplicate identities in an account list — keep newest updatedAt per key. */
export function dedupeTwofaAccounts(accounts: TwofaAccount[]): TwofaDedupeResult {
  const groups = new Map<string, TwofaAccount[]>();
  for (const row of accounts) {
    const key = twofaDedupeKey(row.service, row.account, row.secret, row.browser);
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
