import type { HubSortDir } from "@tool-workspace/hub-ui";
import type { TwofaAccount } from "./types";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";
import type { TwofaMailServiceUsageIndex } from "./twofa-mail-service-usage";
import { lookupTwofaMailServiceUsage } from "./twofa-mail-service-usage";

export function sortableTwofaValue(row: TwofaAccount, key: TwofaTableColumnKey): string | number {
  switch (key) {
    case "service":
      return row.service;
    case "browser":
      return row.browser ?? "";
    case "account":
      return row.account;
    case "mailRecover":
      return row.mailRecover ?? "";
    case "status":
      return row.status;
    case "ownership":
      return row.ownership;
    case "password":
      return row.password ?? "";
    case "secret":
      return row.secret;
    case "note":
      return row.note ?? "";
    case "log":
      return row.log?.[row.log.length - 1]?.message ?? "";
    case "created":
      return new Date(row.createdAt).getTime();
    case "updated":
      return new Date(row.updatedAt).getTime();
    case "linkedServices":
      return 0;
    case "code":
    case "period":
    default:
      return "";
  }
}

export function compareTwofaService(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Browser profile codes (0000, 0001, …) sort numerically when all digits. */
export function compareTwofaBrowser(a: string, b: string): number {
  const ap = (a ?? "").trim();
  const bp = (b ?? "").trim();
  if (!ap && !bp) return 0;
  if (!ap) return 1;
  if (!bp) return -1;
  const an = /^\d+$/.test(ap) ? Number(ap) : NaN;
  const bn = /^\d+$/.test(bp) ? Number(bp) : NaN;
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return ap.localeCompare(bp, undefined, { numeric: true, sensitivity: "base" });
}

function twofaSortableValue(
  row: TwofaAccount,
  key: TwofaTableColumnKey,
  mailServiceUsage?: TwofaMailServiceUsageIndex,
): string | number {
  if (key === "linkedServices" && mailServiceUsage) {
    return lookupTwofaMailServiceUsage(mailServiceUsage, row).serviceCount;
  }
  return sortableTwofaValue(row, key);
}

function compareTwofaScalar(av: string | number, bv: string | number): number {
  return typeof av === "number" && typeof bv === "number"
    ? av - bv
    : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
}

/** Default table order: Service A→Z, then Browser 0000, 0001, … */
export function sortTwofaAccounts(
  accounts: TwofaAccount[],
  sortKey: TwofaTableColumnKey,
  sortDir: HubSortDir,
  mailServiceUsage?: TwofaMailServiceUsageIndex,
): TwofaAccount[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const copy = [...accounts];
  copy.sort((a, b) => {
    if (sortKey === "service") {
      const cmp = compareTwofaService(a.service, b.service);
      if (cmp !== 0) return dir * cmp;
      return dir * compareTwofaBrowser(a.browser ?? "", b.browser ?? "");
    }
    if (sortKey === "browser") {
      const cmp = compareTwofaBrowser(a.browser ?? "", b.browser ?? "");
      if (cmp !== 0) return dir * cmp;
      return dir * compareTwofaService(a.service, b.service);
    }
    const av = twofaSortableValue(a, sortKey, mailServiceUsage);
    const bv = twofaSortableValue(b, sortKey, mailServiceUsage);
    return dir * compareTwofaScalar(av, bv);
  });
  return copy;
}
