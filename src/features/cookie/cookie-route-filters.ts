import type { FilterDef } from "../../components/sales-shell";

export const COOKIE_ROUTE_FILTER_DEFS: FilterDef[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "synced", label: "Synced" },
      { value: "pending", label: "Awaiting sync" },
      { value: "error", label: "Error" },
      { value: "manual", label: "Manual" },
    ],
    showAllLabel: true,
  },
  {
    key: "platform",
    label: "Platform",
    options: [],
    showAllLabel: true,
  },
  {
    key: "type",
    label: "Type",
    options: [
      { value: "facebook", label: "Facebook" },
      { value: "custom", label: "Custom" },
    ],
    showAllLabel: true,
  },
  {
    key: "source",
    label: "Source",
    options: [
      { value: "locked", label: "Source locked" },
      { value: "unset", label: "No source" },
    ],
    showAllLabel: true,
  },
];

export const DEFAULT_COOKIE_ROUTE_FILTER_KEYS = new Set(COOKIE_ROUTE_FILTER_DEFS.map((filter) => filter.key));
