import type { OverviewTocItem } from "../../../overview/overview-toc";

export const TASK_MODAL_TOC = [
  { id: "status", label: "Status", emoji: "📋", chipClass: "border-amber-400/30 bg-amber-500/15" },
  { id: "details", label: "Details", emoji: "✏️", chipClass: "border-indigo-400/30 bg-indigo-500/15" },
  { id: "attachments", label: "Attachments", emoji: "📎", chipClass: "border-sky-400/30 bg-sky-500/15" },
] as const satisfies readonly OverviewTocItem[];

export const TASK_MODAL_ACTIVITY_TOC_ITEM = {
  id: "activity",
  label: "Activity Log",
  emoji: "📜",
  chipClass: "border-emerald-400/30 bg-emerald-500/15",
} as const satisfies OverviewTocItem;

export function taskModalSectionTitle(id: (typeof TASK_MODAL_TOC)[number]["id"] | "activity"): string {
  if (id === "activity") return `${TASK_MODAL_ACTIVITY_TOC_ITEM.emoji} ${TASK_MODAL_ACTIVITY_TOC_ITEM.label}`;
  const item = TASK_MODAL_TOC.find((t) => t.id === id);
  return item ? `${item.emoji} ${item.label}` : id;
}
