import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import type { Profile, Project } from "./types";
import type { Translation } from "./types";
import { buildTodoKanbanFilterDefs } from "./todo-hub-filter-helpers";

export interface TodoFilters {
  searchTerm: string;
  creatorIds: string[];
  priorities: ("low" | "medium" | "high")[];
  dueDates: ("overdue" | "today" | "this_week")[];
  projectIds: number[];
}

export function buildTodoFilterDefs(
  projects: Project[],
  allUsers: Profile[],
  t: Translation,
): FilterDef[] {
  return buildTodoKanbanFilterDefs(projects, allUsers, t);
}

function normalizeMulti(selected: string[] | undefined, allValues: string[]): string[] {
  if (!selected?.length || selected.length >= allValues.length) return [];
  return selected;
}

export function todoFiltersToFilterValues(filters: TodoFilters): FilterValues {
  return {
    project: filters.projectIds.map(String),
    dueDate: [...filters.dueDates],
    creator: [...filters.creatorIds],
    priority: [...filters.priorities],
  };
}

export function filterValuesToTodoFilters(
  values: FilterValues,
  prev: TodoFilters,
  defs: FilterDef[],
): TodoFilters {
  const pick = (key: string) => defs.find((d) => d.key === key)?.options.map((o) => o.value) ?? [];
  return {
    ...prev,
    projectIds: normalizeMulti(values.project, pick("project")).map(Number),
    dueDates: normalizeMulti(values.dueDate, pick("dueDate")) as TodoFilters["dueDates"],
    creatorIds: normalizeMulti(values.creator, pick("creator")),
    priorities: normalizeMulti(values.priority, pick("priority")) as TodoFilters["priorities"],
  };
}
