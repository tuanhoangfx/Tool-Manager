import type { PrefItem } from "../../components/sales-shell/DisplayPrefs";
import { NOTES_FILTER_DEFS } from "./notes-filters";

export const NOTES_HEADER_STAT_DEFS: PrefItem[] = [
  { key: "notes-total", label: "Total notes" },
  { key: "notes-pinned", label: "Pinned" },
  { key: "notes-synced", label: "Synced" },
];

export const NOTES_FILTER_PREF_DEFS: PrefItem[] = NOTES_FILTER_DEFS.map(({ key, label }) => ({
  key,
  label,
}));

export const DEFAULT_NOTES_HEADER_STAT_KEYS = new Set(["notes-total", "notes-pinned", "notes-synced"]);
