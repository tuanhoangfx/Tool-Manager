import type { FilterDef, FilterValues } from "@tool-workspace/hub-ui";
import { PROJECT_COLORS } from "@/todo/constants";
import type { Profile, Project } from "@/todo/types";
import type { Translation } from "@/todo/types";

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
  const projectOpts = [
    { value: "0", label: t.personalProject, color: "#6b7280" },
    ...projects.map((p) => ({
      value: p.id.toString(),
      label: p.name,
      color: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length],
    })),
  ];

  return [
    { key: "project", label: "Projects", showAllLabel: true, options: projectOpts },
    {
      key: "dueDate",
      label: "Due Dates",
      showAllLabel: true,
      options: [
        { value: "overdue", label: t.overdue },
        { value: "today", label: t.dueToday },
        { value: "this_week", label: t.dueThisWeek },
      ],
    },
    {
      key: "creator",
      label: "Creators",
      showAllLabel: true,
      options: allUsers.map((u) => ({
        value: u.id,
        label: u.full_name || u.id,
      })),
    },
    {
      key: "priority",
      label: "Priorities",
      showAllLabel: true,
      options: [
        { value: "low", label: t.low },
        { value: "medium", label: t.medium },
        { value: "high", label: t.high },
      ],
    },
  ];
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
