import type { TwofaAccountStatus } from "./twofa-account-status";
import type { TwofaAccountOwnership } from "./twofa-account-ownership";

export type { TwofaAccountStatus } from "./twofa-account-status";
export type { TwofaAccountOwnership } from "./twofa-account-ownership";

export type TwofaAccountLogField =
  | "service"
  | "browser"
  | "account"
  | "mailRecover"
  | "password"
  | "secret"
  | "status"
  | "ownership"
  | "note";

export type TwofaAccountLogChange = {
  field: TwofaAccountLogField;
  before?: string;
  after?: string;
};

export type TwofaAccountLogEntry = {
  at: string;
  message: string;
  changes?: TwofaAccountLogChange[];
};

export type TwofaAccount = {
  id: string;
  service: string;
  /** Optional 4-digit browser profile code (e.g. 0100, 0101). */
  browser?: string;
  account: string;
  /** Recovery / mailbox email (sheet Mail column). */
  mailRecover?: string;
  /** Optional login password (stored locally). */
  password?: string;
  /** Optional TOTP secret — empty when account has no 2FA. */
  secret: string;
  /** Free-form note for the account vault row. */
  note?: string;
  /** Live operational status of the account. */
  status: TwofaAccountStatus;
  /** Sheet ownership / custody label. */
  ownership: TwofaAccountOwnership;
  /** Audit trail of field changes for this account. */
  log?: TwofaAccountLogEntry[];
  createdAt: string;
  updatedAt: string;
  /** Set when a code is copied or the row is actively used (for time-range filters). */
  lastUsedAt?: string;
};

export type TwofaDraft = {
  service: string;
  browser?: string;
  account: string;
  mailRecover?: string;
  password?: string;
  secret: string;
  note?: string;
  status?: TwofaAccountStatus;
  ownership?: TwofaAccountOwnership;
};
