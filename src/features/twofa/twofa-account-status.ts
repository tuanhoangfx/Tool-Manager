import type { FilterOption } from "@tool-workspace/hub-ui";
import type { TwofaAccount } from "./types";
import { backfillTwofaAccountLog, normalizeTwofaLog } from "./twofa-account-log";

export const TWOFA_ACCOUNT_STATUS_OPTIONS = [
  { id: "active", emoji: "♻️", label: "Active" },
  { id: "disable", emoji: "🚫", label: "Disable" },
  { id: "appeal", emoji: "🚨", label: "Appeal" },
  { id: "error", emoji: "⚠️", label: "Error" },
  { id: "incorrect_info", emoji: "ℹ️", label: "Incorrect Info" },
  { id: "undefined", emoji: "❓", label: "Undefined" },
] as const;

export type TwofaAccountStatus = (typeof TWOFA_ACCOUNT_STATUS_OPTIONS)[number]["id"];

export const DEFAULT_TWOFA_ACCOUNT_STATUS: TwofaAccountStatus = "active";

const STATUS_IDS = new Set<string>(TWOFA_ACCOUNT_STATUS_OPTIONS.map((item) => item.id));

const STATUS_BY_ID = Object.fromEntries(
  TWOFA_ACCOUNT_STATUS_OPTIONS.map((item) => [item.id, item]),
) as Record<TwofaAccountStatus, (typeof TWOFA_ACCOUNT_STATUS_OPTIONS)[number]>;

export function normalizeTwofaAccountStatus(value: unknown): TwofaAccountStatus {
  if (typeof value === "string" && STATUS_IDS.has(value)) {
    return value as TwofaAccountStatus;
  }
  return DEFAULT_TWOFA_ACCOUNT_STATUS;
}

export function formatTwofaAccountStatus(status: TwofaAccountStatus): string {
  const item = STATUS_BY_ID[status];
  return `${item.emoji} ${item.label}`;
}

/** HubSingleFilterDropdown options — status filter + detail hero. */
export function twofaStatusFilterOptions(): FilterOption[] {
  return TWOFA_ACCOUNT_STATUS_OPTIONS.map((item) => ({
    value: item.id,
    label: item.label,
    emoji: item.emoji,
  }));
}

export function normalizeTwofaAccount(row: TwofaAccount): TwofaAccount {
  const note = row.note?.trim();
  const log = normalizeTwofaLog(row.log);
  return backfillTwofaAccountLog({
    ...row,
    secret: row.secret ?? "",
    status: normalizeTwofaAccountStatus(row.status),
    ...(note ? { note } : {}),
    ...(log.length ? { log } : {}),
  });
}

export function normalizeTwofaAccounts(rows: TwofaAccount[]): TwofaAccount[] {
  return rows.map(normalizeTwofaAccount);
}
