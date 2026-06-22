import { newId } from "./storage";
import type { TwofaAccount, TwofaDraft } from "./types";
import { normalizeTwofaAccountStatus, type TwofaAccountStatus } from "./twofa-account-status";
import { withTwofaCreateLog, withTwofaUpdateLog } from "./twofa-account-log";
import {
  pickTwofaVaultWinner,
  twofaDedupeKey,
  twofaIdentityKey,
  twofaVaultIdentityKey,
  twofaVaultSlotKey,
} from "./twofa-identity";
import { normalizeSecret } from "./totp";

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
  const note = draft.note?.trim();
  const status = normalizeTwofaAccountStatus(draft.status);
  return { service, browser, account, secret, password, note, status };
}

export function twofaDraftHasContent(draft: TwofaDraft): boolean {
  const { service, browser, account, secret, password, note } = draftToFields(draft);
  return Boolean(service || browser || account || secret || password || note);
}

/** Upsert one draft: replace existing same identity (delete older duplicates), or append new row. */
export function upsertTwofaDraft(
  prev: TwofaAccount[],
  draft: TwofaDraft,
  now: string,
): TwofaUpsertOutcome | null {
  const { service, browser, account, secret, password, note, status } = draftToFields(draft);
  if (!twofaDraftHasContent(draft)) return null;

  const key = twofaIdentityKey(service, account, secret, browser);
  const matches = prev.filter(
    (row) => twofaIdentityKey(row.service, row.account, row.secret, row.browser) === key,
  );

  if (matches.length > 0) {
    const keeper = matches.reduce((best, row) =>
      Date.parse(row.updatedAt) >= Date.parse(best.updatedAt) ? row : best,
    );
    const removedIds = matches.filter((row) => row.id !== keeper.id).map((row) => row.id);
    const updated: TwofaAccount = withTwofaUpdateLog(
      keeper,
      {
        ...keeper,
        service,
        account,
        secret,
        status,
        updatedAt: now,
        ...(browser ? { browser } : {}),
        ...(password ? { password } : {}),
        ...(note ? { note } : {}),
      },
      now,
    );
    if (!browser) delete updated.browser;
    if (!password) delete updated.password;
    if (!note) delete updated.note;

    const accounts = prev
      .filter((row) => !matches.some((m) => m.id === row.id))
      .concat([updated]);
    return { accounts, row: updated, replaced: true, removedIds };
  }

  const row: TwofaAccount = withTwofaCreateLog(
    {
      id: newId(),
      service,
      ...(browser ? { browser } : {}),
      account,
      ...(password ? { password } : {}),
      secret,
      status,
      ...(note ? { note } : {}),
      createdAt: now,
      updatedAt: now,
    },
    now,
  );
  return { accounts: [...prev, row], row, replaced: false, removedIds: [] };
}

/** Update an existing row by id; remove other rows that share the new identity. */
export function updateTwofaDraft(
  prev: TwofaAccount[],
  id: string,
  draft: TwofaDraft,
  now: string,
): TwofaUpsertOutcome | null {
  const { service, browser, account, secret, password, note, status } = draftToFields(draft);
  if (!twofaDraftHasContent(draft)) return null;

  const current = prev.find((row) => row.id === id);
  if (!current) return null;

  const key = twofaIdentityKey(service, account, secret, browser);
  const vaultKey = twofaVaultIdentityKey(service, account, browser);
  const slotKey = twofaVaultSlotKey(service, account);
  const duplicates = prev.filter((row) => {
    if (row.id === id) return false;
    if (twofaIdentityKey(row.service, row.account, row.secret, row.browser) === key) return true;
    if (twofaVaultIdentityKey(row.service, row.account, row.browser) === vaultKey) return true;
    return twofaVaultSlotKey(row.service, row.account) === slotKey;
  });
  const updated: TwofaAccount = withTwofaUpdateLog(
    current,
    {
      ...current,
      service,
      account,
      secret,
      status,
      updatedAt: now,
      ...(browser ? { browser } : {}),
      ...(password ? { password } : {}),
      ...(note ? { note } : {}),
    },
    now,
  );
  if (!browser) delete updated.browser;
  if (!password) delete updated.password;
  if (!note) delete updated.note;

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

export type TwofaBulkMetaPatch = {
  status?: TwofaAccountStatus;
  note?: string;
  clearNote?: boolean;
  /** When true, append `note` to existing note (newline-separated). */
  appendNote?: boolean;
};

/** Apply status and/or note to many rows — each change appends audit log. */
export function bulkUpdateTwofaMeta(
  prev: TwofaAccount[],
  ids: readonly string[],
  patch: TwofaBulkMetaPatch,
  now: string,
): { accounts: TwofaAccount[]; changed: TwofaAccount[] } {
  const idSet = new Set(ids);
  const changed: TwofaAccount[] = [];
  const accounts = prev.map((row) => {
    if (!idSet.has(row.id)) return row;

    const touchesStatus = patch.status !== undefined && patch.status !== row.status;
    const touchesNote =
      patch.clearNote ||
      (patch.note !== undefined &&
        (patch.appendNote
          ? Boolean(patch.note.trim())
          : (patch.note.trim() || undefined) !== (row.note?.trim() || undefined)));
    if (!touchesStatus && !touchesNote) return row;

    const after: TwofaAccount = { ...row, updatedAt: now };
    if (touchesStatus && patch.status !== undefined) after.status = patch.status;
    if (patch.clearNote) delete after.note;
    else if (patch.note !== undefined) {
      const trimmed = patch.note.trim();
      if (patch.appendNote) {
        if (trimmed) {
          const prev = row.note?.trim();
          after.note = prev ? `${prev}\n${trimmed}` : trimmed;
        }
      } else if (trimmed) after.note = trimmed;
      else delete after.note;
    }

    const updated = withTwofaUpdateLog(row, after, now);
    changed.push(updated);
    return updated;
  });

  return { accounts, changed };
}

/** Find another row that shares the draft identity (for edit conflict checks). */
export function findTwofaDraftConflict(
  accounts: TwofaAccount[],
  draft: TwofaDraft,
  excludeId?: string,
): TwofaAccount | null {
  if (!twofaDraftHasContent(draft)) return null;
  const { service, browser, account, secret } = draftToFields(draft);
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

/** Collapse rows that share vault identity (service + account + browser) — e.g. secret vs no-secret duplicates. */
function collapseTwofaVaultIdentities(accounts: TwofaAccount[]): TwofaDedupeResult {
  const byVault = new Map<string, TwofaAccount[]>();
  for (const row of accounts) {
    if (!row.service.trim() && !row.account.trim()) continue;
    const vk = twofaVaultSlotKey(row.service, row.account);
    if (!vk) continue;
    const list = byVault.get(vk) ?? [];
    list.push(row);
    byVault.set(vk, list);
  }

  const dropIds = new Set<string>();
  for (const group of byVault.values()) {
    if (group.length <= 1) continue;
    const winner = pickTwofaVaultWinner(group);
    for (const row of group) {
      if (row.id !== winner.id) dropIds.add(row.id);
    }
  }

  if (!dropIds.size) return { accounts, removedIds: [] };
  return {
    accounts: accounts.filter((row) => !dropIds.has(row.id)),
    removedIds: [...dropIds],
  };
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
  const vaultCollapsed = collapseTwofaVaultIdentities(kept);
  return {
    accounts: vaultCollapsed.accounts,
    removedIds: [...removedIds, ...vaultCollapsed.removedIds],
  };
}
