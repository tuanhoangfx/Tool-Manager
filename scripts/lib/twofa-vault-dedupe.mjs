/** Mirror of src/features/twofa dedupe — keep in sync with twofa-upsert-accounts + twofa-identity. */

export function normalizeSecret(raw) {
  return String(raw ?? "")
    .replace(/\s+/g, "")
    .replace(/=+$/, "")
    .toUpperCase();
}

export function twofaVaultIdentityKey(service, account, browser) {
  const s = String(service ?? "").trim().toLowerCase();
  const a = String(account ?? "").trim().toLowerCase();
  const b = String(browser ?? "").trim().toLowerCase();
  return b ? `sab:${s}\0${a}\0${b}` : `sa:${s}\0${a}`;
}

export function twofaIdentityKey(service, account, secret, browser) {
  const s = String(service ?? "").trim().toLowerCase();
  const a = String(account ?? "").trim().toLowerCase();
  const b = String(browser ?? "").trim().toLowerCase();
  if (s || a) return b ? `sab:${s}\0${a}\0${b}` : `sa:${s}\0${a}`;
  return `secret:${normalizeSecret(secret)}`;
}

export function twofaDedupeKey(service, account, secret, browser) {
  const normSecret = normalizeSecret(secret);
  if (normSecret) return `secret:${normSecret}`;
  return twofaIdentityKey(service, account, secret, browser);
}

export function pickTwofaVaultWinner(group) {
  return group.reduce((best, row) => {
    const rowAt = Date.parse(row.updatedAt);
    const bestAt = Date.parse(best.updatedAt);
    if (rowAt > bestAt) return row;
    if (rowAt < bestAt) return best;
    const rowEmpty = !normalizeSecret(row.secret);
    const bestEmpty = !normalizeSecret(best.secret);
    if (rowEmpty && !bestEmpty) return row;
    return best;
  });
}

function collapseTwofaVaultIdentities(accounts) {
  const byVault = new Map();
  for (const row of accounts) {
    if (!String(row.service ?? "").trim() && !String(row.account ?? "").trim()) continue;
    const vk = twofaVaultIdentityKey(row.service, row.account, row.browser);
    const list = byVault.get(vk) ?? [];
    list.push(row);
    byVault.set(vk, list);
  }

  const dropIds = new Set();
  const vaultGroups = [];
  for (const [vaultKey, group] of byVault.entries()) {
    if (group.length <= 1) continue;
    const winner = pickTwofaVaultWinner(group);
    const removed = group.filter((row) => row.id !== winner.id);
    vaultGroups.push({ vaultKey, winner, removed });
    for (const row of removed) dropIds.add(row.id);
  }

  if (!dropIds.size) return { accounts, removedIds: [], vaultGroups: [] };
  return {
    accounts: accounts.filter((row) => !dropIds.has(row.id)),
    removedIds: [...dropIds],
    vaultGroups,
  };
}

/** Same algorithm as dedupeTwofaAccounts() in the app. */
export function dedupeTwofaAccounts(accounts) {
  const groups = new Map();
  for (const row of accounts) {
    const key = twofaDedupeKey(row.service, row.account, row.secret, row.browser);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const kept = [];
  const removedIds = [];
  const dedupeKeyGroups = [];

  for (const [key, group] of groups.entries()) {
    if (group.length <= 1) {
      kept.push(group[0]);
      continue;
    }
    const winner = group.reduce((best, row) =>
      Date.parse(row.updatedAt) >= Date.parse(best.updatedAt) ? row : best,
    );
    kept.push(winner);
    const removed = group.filter((row) => row.id !== winner.id);
    dedupeKeyGroups.push({ key, winner, removed });
    for (const row of removed) removedIds.push(row.id);
  }

  kept.sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || String(a.service).localeCompare(String(b.service)),
  );

  const vaultCollapsed = collapseTwofaVaultIdentities(kept);
  return {
    accounts: vaultCollapsed.accounts,
    removedIds: [...removedIds, ...vaultCollapsed.removedIds],
    dedupeKeyGroups,
    vaultGroups: vaultCollapsed.vaultGroups,
  };
}

/** Human-readable purge plan grouped by service label. */
export function planTwofaVaultPurge(accounts) {
  const active = accounts.filter((row) => !row.deleted_at);
  const mapped = active.map((row) => ({
    id: row.id,
    service: row.service ?? "",
    browser: row.browser ?? "",
    account: row.account ?? "",
    secret: row.secret ?? "",
    updatedAt: row.updated_at ?? row.updatedAt ?? "",
  }));

  const { accounts: kept, removedIds, dedupeKeyGroups, vaultGroups } = dedupeTwofaAccounts(mapped);
  const removedSet = new Set(removedIds);
  const removedRows = mapped.filter((row) => removedSet.has(row.id));
  const keptSet = new Set(kept.map((row) => row.id));

  const byService = new Map();
  for (const row of removedRows) {
    const svc = row.service.trim() || "Others";
    const list = byService.get(svc) ?? [];
    list.push(row);
    byService.set(svc, list);
  }

  const serviceCounts = [...byService.entries()]
    .map(([service, rows]) => ({ service, count: rows.length, rows }))
    .sort((a, b) => b.count - a.count || a.service.localeCompare(b.service));

  return {
    before: mapped.length,
    after: kept.length,
    removedIds,
    removedRows,
    keptIds: [...keptSet],
    serviceCounts,
    dedupeKeyGroups,
    vaultGroups,
  };
}
