import type { TwofaAccount } from "./types";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

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
    case "code":
    case "period":
    default:
      return "";
  }
}
