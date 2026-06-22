export type TwofaTableColumnKey =
  | "service"
  | "browser"
  | "account"
  | "status"
  | "password"
  | "secret"
  | "code"
  | "period"
  | "note"
  | "log"
  | "created"
  | "updated";

export type TwofaTableColumnDef = {
  key: TwofaTableColumnKey;
  required?: boolean;
};

export const TWOFA_TABLE_COLUMN_DEFS: readonly TwofaTableColumnDef[] = [
  { key: "service", required: true },
  { key: "browser" },
  { key: "account" },
  { key: "status", required: true },
  { key: "password" },
  { key: "secret" },
  { key: "code", required: true },
  { key: "period" },
  { key: "note" },
  { key: "log" },
  { key: "created" },
  { key: "updated" },
];

export const DEFAULT_TWOFA_TABLE_COLUMNS = new Set<TwofaTableColumnKey>(
  TWOFA_TABLE_COLUMN_DEFS.map((c) => c.key),
);
