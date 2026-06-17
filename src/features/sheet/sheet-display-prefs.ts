import type { PrefItem } from "../../components/sales-shell/DisplayPrefs";

export const SHEET_HEADER_STAT_DEFS: PrefItem[] = [
  { key: "sheet-total", label: "Sheets" },
  { key: "sheet-active", label: "Active" },
];

export const DEFAULT_SHEET_HEADER_STAT_KEYS = new Set(["sheet-total", "sheet-active"]);
