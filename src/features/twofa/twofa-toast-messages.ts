import type { TwofaAddManyResult } from "./useTwofaAccounts";

export function formatTwofaEntryLabel(service: string, account: string): string {
  const s = service.trim();
  const a = account.trim();
  if (s && a) return `${s} · ${a}`;
  if (s) return s;
  if (a) return a;
  return "Secret-only entry";
}

export function twofaSingleAddToast(replaced: boolean, service: string, account: string): string {
  const label = formatTwofaEntryLabel(service, account);
  return replaced ? `Replaced existing entry: ${label}` : `Added account: ${label}`;
}

export function twofaImportToast(result: TwofaAddManyResult): string {
  if (result.replaced > 0) {
    return `Imported ${result.total} (${result.added} new, ${result.replaced} replaced)`;
  }
  return `Imported ${result.total} account${result.total === 1 ? "" : "s"}`;
}

export function twofaDedupeToast(removed: number): string {
  if (removed === 0) return "No duplicate accounts found";
  return `Removed ${removed} duplicate account${removed === 1 ? "" : "s"}`;
}

export function twofaUpdateToast(service: string, account: string): string {
  return `Updated ${formatTwofaEntryLabel(service, account)}`;
}
