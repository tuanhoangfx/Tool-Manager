import { normalizeSecret } from "./totp";
import type { TwofaAccount } from "./types";

/** Pick canonical row when multiple rows share service + account (+ browser). */
export function pickTwofaVaultWinner(group: readonly TwofaAccount[]): TwofaAccount {
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

/**
 * Stable identity for upsert/edit conflict checks.
 *
 * This matches the "entry identity" in the UI: service + account (+ browser).
 */
export function twofaVaultIdentityKey(service: string, account: string, browser?: string): string {
  const s = service.trim().toLowerCase();
  const a = account.trim().toLowerCase();
  const b = browser?.trim().toLowerCase() ?? "";
  return b ? `sab:${s}\0${a}\0${b}` : `sa:${s}\0${a}`;
}

/** Service + account slot — ignores browser for duplicate collapse (import variants). */
export function twofaVaultSlotKey(service: string, account: string): string {
  const s = service.trim().toLowerCase();
  const a = account.trim().toLowerCase();
  if (!s && !a) return "";
  return `slot:${s}\0${a}`;
}

/** Drop local rows that shadow a cloud row for the same service+account slot under a different id. */
export function dropShadowLocalRows(accounts: TwofaAccount[], remote: TwofaAccount[]): TwofaAccount[] {
  if (!remote.length) return accounts;
  const remoteIds = new Set(remote.map((row) => row.id));
  const remoteSlots = new Set<string>();
  for (const row of remote) {
    const slot = twofaVaultSlotKey(row.service, row.account);
    if (slot) remoteSlots.add(slot);
  }
  return accounts.filter((row) => {
    if (remoteIds.has(row.id)) return true;
    const slot = twofaVaultSlotKey(row.service, row.account);
    if (slot && remoteSlots.has(slot)) return false;
    return true;
  });
}

export function twofaIdentityKey(
  service: string,
  account: string,
  secret: string,
  browser?: string,
): string {
  const s = service.trim().toLowerCase();
  const a = account.trim().toLowerCase();
  const b = browser?.trim().toLowerCase() ?? "";
  if (s || a) return b ? `sab:${s}\0${a}\0${b}` : `sa:${s}\0${a}`;
  return `secret:${normalizeSecret(secret)}`;
}

/**
 * Stable key for dedupe.
 *
 * Rule: if a secret exists, use it as the primary key so that importing the same
 * TOTP under slightly different service/account labels auto-collapses.
 */
export function twofaDedupeKey(
  service: string,
  account: string,
  secret: string,
  browser?: string,
): string {
  const normSecret = normalizeSecret(secret);
  if (normSecret) return `secret:${normSecret}`;
  return twofaIdentityKey(service, account, secret, browser);
}
