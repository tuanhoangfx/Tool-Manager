import type { FilterDef, FilterOption } from "@tool-workspace/hub-ui";
import type { Profile } from "./types";
import { todoProfileAssigneeTriggerLabel, todoProfileDisplayLabel } from "./todo-profile-display";

/** Golden multi-select filter def — wraps HubMultiFilterDropdown (P0004 FilterBar). */
export function buildTodoMultiFilterDef(key: string, label: string, options: FilterOption[]): FilterDef {
  return { key, label, showAllLabel: true, options };
}

export function profileFilterOptions(
  users: Profile[],
  opts?: { compactTrigger?: boolean },
): FilterOption[] {
  return users.map((u) => ({
    value: u.id,
    label: opts?.compactTrigger ? todoProfileAssigneeTriggerLabel(u) : todoProfileDisplayLabel(u),
    iconSrc: u.avatar_url || undefined,
  }));
}
