export type TwofaTableColumnKey =
  | "service"
  | "account"
  | "password"
  | "secret"
  | "code"
  | "period"
  | "created"
  | "used";

export type TwofaTableColumnItem = {
  key: TwofaTableColumnKey;
  label: string;
  required?: boolean;
};

export const TWOFA_TABLE_COLUMN_ITEMS: TwofaTableColumnItem[] = [
  { key: "service", label: "Service", required: true },
  { key: "account", label: "Account" },
  { key: "password", label: "Password" },
  { key: "secret", label: "Secret" },
  { key: "code", label: "Code", required: true },
  { key: "period", label: "Time" },
  { key: "created", label: "Created" },
  { key: "used", label: "Last used" },
];

const STORAGE_KEY = "p0020:twofa-table-columns";
const ALL_KEYS = new Set(TWOFA_TABLE_COLUMN_ITEMS.map((c) => c.key));

export const DEFAULT_TWOFA_TABLE_COLUMNS = new Set(TWOFA_TABLE_COLUMN_ITEMS.map((c) => c.key));

export function readTwofaTableColumns(): Set<TwofaTableColumnKey> {
  if (typeof window === "undefined") return new Set(DEFAULT_TWOFA_TABLE_COLUMNS);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set(DEFAULT_TWOFA_TABLE_COLUMNS);
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return new Set(DEFAULT_TWOFA_TABLE_COLUMNS);
    const next = new Set(parsed.filter((k): k is TwofaTableColumnKey => ALL_KEYS.has(k as TwofaTableColumnKey)));
    for (const item of TWOFA_TABLE_COLUMN_ITEMS) {
      if (item.required) next.add(item.key);
    }
    return next.size ? next : new Set(DEFAULT_TWOFA_TABLE_COLUMNS);
  } catch {
    return new Set(DEFAULT_TWOFA_TABLE_COLUMNS);
  }
}

export function writeTwofaTableColumns(columns: Set<TwofaTableColumnKey>) {
  const next = new Set(columns);
  for (const item of TWOFA_TABLE_COLUMN_ITEMS) {
    if (item.required) next.add(item.key);
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  window.dispatchEvent(new CustomEvent("twofa-table-columns-change"));
}

export function resetTwofaTableColumns() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("twofa-table-columns-change"));
}
