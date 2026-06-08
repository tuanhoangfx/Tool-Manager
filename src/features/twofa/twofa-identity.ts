import { normalizeSecret } from "./totp";

/** Stable identity for dedup — matches DB unique (user_id, service, account); secret-only rows use secret. */
export function twofaIdentityKey(service: string, account: string, secret: string): string {
  const s = service.trim().toLowerCase();
  const a = account.trim().toLowerCase();
  if (s || a) return `sa:${s}\0${a}`;
  return `secret:${normalizeSecret(secret)}`;
}
