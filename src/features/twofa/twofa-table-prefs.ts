import {
  countHiddenDirectoryTableColumns,
  createDirectoryTableColumnPrefs,
  type DirectoryTableColumnItem,
} from "@tool-workspace/hub-ui";
import { buildTwofaDirectoryColumnItems } from "./twofa-column-meta";
import {
  DEFAULT_TWOFA_TABLE_COLUMNS,
  type TwofaTableColumnKey,
} from "./twofa-table-keys";

export type { TwofaTableColumnKey } from "./twofa-table-keys";
export { DEFAULT_TWOFA_TABLE_COLUMNS, TWOFA_TABLE_COLUMN_DEFS } from "./twofa-table-keys";

export type TwofaTableColumnItem = DirectoryTableColumnItem<TwofaTableColumnKey>;

export const TWOFA_TABLE_COLUMN_ITEMS: TwofaTableColumnItem[] = buildTwofaDirectoryColumnItems();

export const TWOFA_TABLE_COLUMN_PREFS = createDirectoryTableColumnPrefs<TwofaTableColumnKey>({
  storageKey: "p0020:twofa-table-columns",
  items: TWOFA_TABLE_COLUMN_ITEMS,
  defaultKeys: DEFAULT_TWOFA_TABLE_COLUMNS,
  changeEvent: "twofa-table-columns-change",
  legacyAliases: { used: "updated" },
});

export function readTwofaTableColumns(): Set<TwofaTableColumnKey> {
  return TWOFA_TABLE_COLUMN_PREFS.read();
}

export function writeTwofaTableColumns(columns: Set<TwofaTableColumnKey>) {
  TWOFA_TABLE_COLUMN_PREFS.write(columns);
}

export function resetTwofaTableColumns() {
  TWOFA_TABLE_COLUMN_PREFS.reset();
}

export function countHiddenTwofaTableColumns(): number {
  return countHiddenDirectoryTableColumns(TWOFA_TABLE_COLUMN_ITEMS, readTwofaTableColumns());
}
