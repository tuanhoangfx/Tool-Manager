import { TOTP } from "otpauth";
import { normalizeSecret } from "./twofa-secret-normalize";

export { normalizeSecret } from "./twofa-secret-normalize";

export function createTotp(service: string, account: string, secret: string) {
  const clean = normalizeSecret(secret);
  if (!clean) {
    throw new Error("Missing TOTP secret");
  }
  return new TOTP({
    issuer: service.trim() || "P0020-Data-Box",
    label: account.trim() || "account",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: clean,
  });
}

export function generateCode(service: string, account: string, secret: string): string | null {
  const clean = normalizeSecret(secret);
  if (!clean) return null;
  try {
    return createTotp(service, account, secret).generate();
  } catch {
    return null;
  }
}

/** Heuristic for bulk import: distinguish Platform|ID|Pass from Platform|ID|2FA. */
export function isPlausibleTotpSecret(raw: string): boolean {
  const clean = normalizeSecret(raw);
  if (clean.length < 8) return false;
  return /^[A-Z2-7]+$/.test(clean);
}

export function secondsRemaining(period = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}
