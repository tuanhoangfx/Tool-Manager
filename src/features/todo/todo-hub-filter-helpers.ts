import type { FilterDef, FilterOption } from "@tool-workspace/hub-ui";
import type { Profile } from "./types";

/** Golden multi-select filter def — wraps HubMultiFilterDropdown (P0004 FilterBar). */
export function buildTodoMultiFilterDef(key: string, label: string, options: FilterOption[]): FilterDef {
  return { key, label, showAllLabel: true, options };
}

export function profileFilterOptions(users: Profile[]): FilterOption[] {
  return users.map((u) => ({
    value: u.id,
    label: u.full_name || u.id,
    iconSrc: u.avatar_url || undefined,
  }));
}
