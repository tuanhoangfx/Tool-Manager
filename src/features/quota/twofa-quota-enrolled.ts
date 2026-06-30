import type { TwofaAccount } from "../twofa/types";

/** Row is visible on Quota tab — never all ChatGPT/Claude services by name alone. */
export function isQuotaEnrolledAccount(row: TwofaAccount): boolean {
  if (row.quotaEnrolledAt) return true;
  if (row.note?.includes('"source":"cockpit"')) return true;
  if (row.note?.includes("Cockpit credential:")) return true;
  return false;
}

export function quotaEnrollmentIso(now = new Date()): string {
  return now.toISOString();
}
