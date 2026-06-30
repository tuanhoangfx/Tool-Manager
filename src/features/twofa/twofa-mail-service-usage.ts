import type { TwofaAccount } from "./types";
import { isTwofaMailAccount } from "./twofa-vault-scope";

export type TwofaMailServiceUsage = {
  /** Distinct platform names on Services slice referencing this mailbox. */
  serviceCount: number;
  /** Vault rows referencing this mailbox (recover mail or login email). */
  rowCount: number;
  /** Sorted unique service labels for tooltips. */
  labels: string[];
};

export type TwofaMailServiceUsageIndex = Map<string, TwofaMailServiceUsage>;

type UsageBucket = {
  services: Set<string>;
  rowCount: number;
};

export function normalizeMailboxEmail(email: string): string {
  return email.trim().toLowerCase();
}

function serviceLabel(row: TwofaAccount): string {
  return row.service.trim() || "Other";
}

function linkMailbox(index: Map<string, UsageBucket>, email: string, row: TwofaAccount): void {
  const key = normalizeMailboxEmail(email);
  if (!key.includes("@")) return;
  let bucket = index.get(key);
  if (!bucket) {
    bucket = { services: new Set(), rowCount: 0 };
    index.set(key, bucket);
  }
  bucket.rowCount += 1;
  bucket.services.add(serviceLabel(row));
}

/** Count Services vault rows that use each mailbox email (recover or login ID). */
export function buildTwofaMailServiceUsageIndex(
  accounts: readonly TwofaAccount[],
): Map<string, TwofaMailServiceUsage> {
  const buckets = new Map<string, UsageBucket>();

  for (const row of accounts) {
    if (isTwofaMailAccount(row)) continue;

    const recover = row.mailRecover?.trim();
    if (recover) linkMailbox(buckets, recover, row);

    const account = row.account.trim();
    if (account.includes("@")) linkMailbox(buckets, account, row);
  }

  const index = new Map<string, TwofaMailServiceUsage>();
  for (const [email, bucket] of buckets) {
    const labels = [...bucket.services].sort((a, b) => a.localeCompare(b));
    index.set(email, {
      serviceCount: labels.length,
      rowCount: bucket.rowCount,
      labels,
    });
  }
  return index;
}

export function lookupTwofaMailServiceUsage(
  index: Map<string, TwofaMailServiceUsage>,
  mailRow: TwofaAccount,
): TwofaMailServiceUsage {
  const email = mailRow.account.trim();
  if (!email.includes("@")) {
    return { serviceCount: 0, rowCount: 0, labels: [] };
  }
  return index.get(normalizeMailboxEmail(email)) ?? { serviceCount: 0, rowCount: 0, labels: [] };
}

export function formatTwofaMailServiceUsageTitle(usage: TwofaMailServiceUsage): string {
  if (usage.serviceCount === 0) return "No linked service accounts";
  const names = usage.labels.join(", ");
  if (usage.rowCount === usage.serviceCount) {
    return names;
  }
  return `${names} (${usage.rowCount} vault rows)`;
}
