import type { TwofaAccount } from "./types";
import { twofaActivityAt } from "./twofa-time";
import type { TwofaTableColumnKey } from "./twofa-table-prefs";

export function sortableTwofaValue(row: TwofaAccount, key: TwofaTableColumnKey): string | number {
  switch (key) {
    case "service":
      return row.service;
    case "browser":
      return row.browser ?? "";
    case "account":
      return row.account;
    case "password":
      return row.password ?? "";
    case "secret":
      return row.secret;
    case "created":
      return new Date(row.createdAt).getTime();
    case "used":
      return new Date(twofaActivityAt(row)).getTime();
    case "code":
    case "period":
    default:
      return "";
  }
}
