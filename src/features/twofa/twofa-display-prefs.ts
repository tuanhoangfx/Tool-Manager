import type { PrefItem } from "../../components/sales-shell/DisplayPrefs";

export const TWOFA_HEADER_STAT_DEFS: PrefItem[] = [
  { key: "twofa-total", label: "Total accounts" },
  { key: "twofa-in-range", label: "In time range" },
];

export const DEFAULT_TWOFA_HEADER_STAT_KEYS = new Set(["twofa-total", "twofa-in-range"]);
