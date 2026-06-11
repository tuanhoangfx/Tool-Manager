import type { FilterDef } from "../../components/sales-shell";

/** Golden FilterBar defs — Status + Platform (icons: badge-registry + platform iconSrc). */
export const COOKIE_ROUTE_FILTER_DEFS: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "synced", label: "Synced", color: "#22c55e" },
      { value: "pending", label: "Awaiting sync", color: "#f59e0b" },
      { value: "error", label: "Error", color: "#ef4444" },
      { value: "manual", label: "Manual", color: "#6b7394" },
    ],
    showAllLabel: true,
  },
  {
    key: "platform",
    label: "Platform",
    options: [],
    showAllLabel: true,
  },
];

export const DEFAULT_COOKIE_ROUTE_FILTER_KEYS = new Set(COOKIE_ROUTE_FILTER_DEFS.map((filter) => filter.key));
