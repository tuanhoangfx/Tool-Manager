import type { TwofaAccount } from "./types";

/** Vault directory slice — shared by Services and Mail sub-views. */
export type TwofaVaultScope = "services" | "mail";

/** Mail sub-view: mailbox providers only (by `service` name — not login email domain). */
const MAIL_PROVIDER_SERVICES = new Set([
  "gmail",
  "google mail",
  "googlemail",
  "outlook",
  "hotmail",
  "live",
  "msn",
  "outlook.com",
  "hotmail.com",
  "live.com",
]);

function normalizeMailServiceName(service: string): string {
  return service.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Row belongs to the Mail vault when `service` is a mailbox provider (Gmail, Outlook, …). */
export function isTwofaMailAccount(row: TwofaAccount): boolean {
  const service = normalizeMailServiceName(row.service);
  return MAIL_PROVIDER_SERVICES.has(service);
}

export function filterTwofaVaultScope(
  accounts: readonly TwofaAccount[],
  scope: TwofaVaultScope,
): TwofaAccount[] {
  if (scope === "mail") return accounts.filter(isTwofaMailAccount);
  return accounts.filter((row) => !isTwofaMailAccount(row));
}
