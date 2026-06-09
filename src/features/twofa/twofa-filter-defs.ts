import type { FilterDef } from "../../components/sales-shell";

export const TWOFA_FILTER_DEFS: FilterDef[] = [
  {
    key: "service",
    label: "Service",
    options: [],
    showAllLabel: true,
  },
  {
    key: "usage",
    label: "Usage",
    options: [
      { value: "recent", label: "Used (7d)" },
      { value: "never", label: "Never used" },
    ],
    showAllLabel: true,
  },
];

export const DEFAULT_TWOFA_FILTER_KEYS = new Set(TWOFA_FILTER_DEFS.map((f) => f.key));
