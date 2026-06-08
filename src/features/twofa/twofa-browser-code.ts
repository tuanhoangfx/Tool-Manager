/** 4-digit browser profile code (e.g. 0100, 0101). */
export const BROWSER_CODE_RE = /^\d{4}$/;

export function isBrowserCode(value: string): boolean {
  return BROWSER_CODE_RE.test(value.trim());
}

export function normalizeBrowserCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.padStart(4, "0");
}
