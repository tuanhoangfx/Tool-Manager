import type { SortConfig } from "./taskUtils";

export type CalendarSortState = {
  id: "default" | "status" | "priority" | "creation_date";
  config: SortConfig;
};
