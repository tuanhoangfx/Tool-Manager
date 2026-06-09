import { normalizeSecret } from "./totp";

/** Stable identity for dedup — matches DB unique (user_id, service, account, coalesce(browser,'')); secret-only rows use secret. */
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
