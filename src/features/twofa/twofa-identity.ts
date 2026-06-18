import { normalizeSecret } from "./totp";

/**
 * Stable identity for upsert/edit conflict checks.
 *
 * This matches the "entry identity" in the UI: service + account (+ browser).
 */
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
