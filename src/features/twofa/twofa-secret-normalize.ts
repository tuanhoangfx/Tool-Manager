/** Base32 secret cleanup — no otpauth dependency (safe for Notes shell imports). */
export function normalizeSecret(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
}
