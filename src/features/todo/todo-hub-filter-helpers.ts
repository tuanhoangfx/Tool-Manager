import type { FilterDef, FilterOption } from "@tool-workspace/hub-ui";
import { PROJECT_COLORS } from "./constants";
import type { Profile, Project, Task } from "./types";
import type { Translation } from "./types";
import { todoProfileAssigneeTriggerLabel, todoProfileDisplayLabel } from "./todo-profile-display";

/** SSOT priority emoji — task modal filter, badges, Kanban. */
export const TODO_PRIORITY_EMOJI: Record<Task["priority"], string> = {
  low: "💤",
  medium: "⚡",
  high: "🚨",
};

/** Project folder trigger — panel rows use per-project color dots. */
export const TODO_PROJECT_FOLDER_EMOJI = "📁";

/** Due-date filter trigger emoji (Kanban toolbar + task modal date picker). */
export const TODO_TASK_DETAIL_DUE_DATE_EMOJI = "🗓️";

/** Kanban due-date filter emojis — panel option rows. */
export const TODO_DUE_DATE_FILTER_EMOJI = {
  overdue: "🔴",
  today: "📅",
  this_week: "📆",
} as const;

export const TODO_CREATOR_FILTER_EMOJI = "👥";
export const TODO_PRIORITY_FILTER_EMOJI = "⭐";

/** Task modal field label emojis — match Kanban filter triggers. */
export const TODO_FILTER_FIELD_EMOJI = {
  project: TODO_PROJECT_FOLDER_EMOJI,
  assignee: TODO_CREATOR_FILTER_EMOJI,
  dueDate: TODO_TASK_DETAIL_DUE_DATE_EMOJI,
  priority: TODO_PRIORITY_FILTER_EMOJI,
} as const;

/** Task modal project filter — color dot per project in panel; trigger uses TODO_PROJECT_FOLDER_EMOJI. */
export function buildTodoTaskDetailProjectOptions(
  t: Pick<Translation, "personalProject">,
  userProjects: Project[],
): FilterOption[] {
  return [
    {
      value: "personal",
      label: t.personalProject,
      color: "#6b7280",
    },
    ...userProjects.map((p) => ({
      value: p.id.toString(),
      label: p.name,
      color: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length],
    })),
  ];
}

/** Assignee / creator / employee filters — avatar when set; else workspace role icon (Crown / Shield / User). */
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

/** @deprecated Use profileFilterOptions(users, { compactTrigger: true }). */
export function profileFilterOptionsForTaskDetail(users: Profile[]): FilterOption[] {
  return profileFilterOptions(users, { compactTrigger: true });
}

/** Priority filter options — Kanban toolbar + task modal (emoji SSOT). */
export function buildTodoPriorityFilterOptions(
  t: Pick<Translation, "low" | "medium" | "high">,
): FilterOption[] {
  return (["low", "medium", "high"] as const).map((value) => ({
    value,
    label: t[value],
    emoji: TODO_PRIORITY_EMOJI[value],
  }));
}

/** @deprecated Use buildTodoPriorityFilterOptions */
export const buildTodoTaskDetailPriorityOptions = buildTodoPriorityFilterOptions;

/** Kanban due-date filter options. */
export function buildTodoDueDateFilterOptions(
  t: Pick<Translation, "overdue" | "dueToday" | "dueThisWeek">,
): FilterOption[] {
  return [
    { value: "overdue", label: t.overdue, emoji: TODO_DUE_DATE_FILTER_EMOJI.overdue },
    { value: "today", label: t.dueToday, emoji: TODO_DUE_DATE_FILTER_EMOJI.today },
    { value: "this_week", label: t.dueThisWeek, emoji: TODO_DUE_DATE_FILTER_EMOJI.this_week },
  ];
}

/** Kanban project filter — value `0` = personal (differs from task modal `personal`). */
export function buildTodoKanbanProjectOptions(
  projects: Project[],
  t: Pick<Translation, "personalProject">,
): FilterOption[] {
  return [
    { value: "0", label: t.personalProject, color: "#6b7280" },
    ...projects.map((p) => ({
      value: p.id.toString(),
      label: p.name,
      color: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length],
    })),
  ];
}

/** Kanban toolbar filter defs — same option builders as task modal where applicable. */
export function buildTodoKanbanFilterDefs(
  projects: Project[],
  allUsers: Profile[],
  t: Translation,
): FilterDef[] {
  return [
    {
      key: "project",
      label: t.folderFilter,
      showAllLabel: false,
      options: buildTodoKanbanProjectOptions(projects, t),
      triggerEmoji: TODO_PROJECT_FOLDER_EMOJI,
    },
    {
      key: "dueDate",
      label: t.dueDatesFilter,
      showAllLabel: false,
      options: buildTodoDueDateFilterOptions(t),
      triggerEmoji: TODO_TASK_DETAIL_DUE_DATE_EMOJI,
    },
    {
      key: "creator",
      label: t.creatorsFilter,
      showAllLabel: false,
      options: profileFilterOptions(allUsers),
      triggerEmoji: TODO_CREATOR_FILTER_EMOJI,
    },
    {
      key: "priority",
      label: t.prioritiesFilter,
      showAllLabel: false,
      options: buildTodoPriorityFilterOptions(t),
      triggerEmoji: TODO_PRIORITY_FILTER_EMOJI,
    },
  ];
}

/** Task modal project filter def. */
export function buildTodoTaskDetailProjectFilterDef(
  t: Pick<Translation, "project" | "personalProject">,
  userProjects: Project[],
): FilterDef {
  return buildTodoMultiFilterDef("project", t.project, buildTodoTaskDetailProjectOptions(t, userProjects), {
    triggerEmoji: TODO_PROJECT_FOLDER_EMOJI,
  });
}

/** Task modal assignee filter def. */
export function buildTodoTaskDetailAssigneeFilterDef(
  t: Pick<Translation, "assignee">,
  allUsers: Profile[],
): FilterDef {
  return buildTodoMultiFilterDef("assignee", t.assignee, profileFilterOptions(allUsers, { compactTrigger: true }), {
    triggerEmoji: TODO_CREATOR_FILTER_EMOJI,
  });
}

/** Settings / display — emoji + translated priority label. */
export function formatTodoPriorityDisplayLabel(
  value: Task["priority"],
  t: Pick<Translation, "low" | "medium" | "high">,
): string {
  return `${TODO_PRIORITY_EMOJI[value]} ${t[value]}`;
}

/** Golden multi-select filter def — wraps HubMultiFilterDropdown (P0004 FilterBar). */
export function buildTodoMultiFilterDef(
  key: string,
  label: string,
  options: FilterOption[],
  opts?: { triggerEmoji?: string; showAllLabel?: boolean },
): FilterDef {
  return { key, label, showAllLabel: opts?.showAllLabel ?? false, options, ...opts };
}
