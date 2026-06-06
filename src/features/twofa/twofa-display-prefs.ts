import type { PrefItem } from "../../components/sales-shell/DisplayPrefs";

export const TWOFA_KPI_DEFS: PrefItem[] = [
  { key: "accounts_total", label: "Total accounts" },
  { key: "accounts_shown", label: "Accounts (shown)" },
  { key: "identified_accounts", label: "Identified accounts" },
  { key: "with_password", label: "With password" },
  { key: "used_7d", label: "Used (7d)" },
];

export const TWOFA_CHART_DEFS: PrefItem[] = [
  { key: "service_bar", label: "Top services (bar)" },
  { key: "identity_bar", label: "Account identity (bar)" },
  { key: "usage_donut", label: "Usage (donut)" },
  { key: "password_donut", label: "Password saved (donut)" },
];

export const TWOFA_HEADER_STAT_DEFS: PrefItem[] = [
  { key: "twofa-total", label: "Total accounts" },
  { key: "twofa-in-range", label: "In time range" },
];

export const DEFAULT_TWOFA_KPI_KEYS = new Set(TWOFA_KPI_DEFS.map((k) => k.key));
export const DEFAULT_TWOFA_CHART_KEYS = new Set(TWOFA_CHART_DEFS.map((c) => c.key));
export const DEFAULT_TWOFA_HEADER_STAT_KEYS = new Set(["twofa-total", "twofa-in-range"]);
