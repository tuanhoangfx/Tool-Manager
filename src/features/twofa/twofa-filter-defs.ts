import type { FilterDef } from "../../components/sales-shell";
import { twofaStatusFilterOptions } from "./twofa-account-status";

export const TWOFA_FILTER_DEFS: FilterDef[] = [
  {
    key: "service",
    label: "Service",
    options: [],
    showAllLabel: false,
    suppressDefaultTriggerIcon: true,
  },
  {
    key: "status",
    label: "Status",
    options: twofaStatusFilterOptions(),
    showAllLabel: false,
  },
  {
    key: "usage",
    label: "Usage",
    options: [
      { value: "recent", label: "Used (7d)" },
      { value: "never", label: "Never used" },
    ],
    showAllLabel: false,
  },
];

export const DEFAULT_TWOFA_FILTER_KEYS = new Set(TWOFA_FILTER_DEFS.map((f) => f.key));
