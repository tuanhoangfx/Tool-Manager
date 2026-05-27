import { TOTP } from "otpauth";

export function normalizeSecret(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
}

export function createTotp(service: string, account: string, secret: string) {
  const clean = normalizeSecret(secret);
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
  try {
    return createTotp(service, account, secret).generate();
  } catch {
    return null;
  }
}

export function secondsRemaining(period = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return period - (now % period);
}
