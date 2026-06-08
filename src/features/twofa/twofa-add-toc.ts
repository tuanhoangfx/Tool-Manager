import type { OverviewTocItem } from "../overview/overview-toc";

export const TWOFA_ADD_TABS = [
  { id: "single", label: "Single", emoji: "🔑", chipClass: "border-amber-400/30 bg-amber-500/15" },
  { id: "bulk", label: "Bulk", emoji: "📋", chipClass: "border-amber-400/30 bg-amber-500/15" },
] as const satisfies readonly OverviewTocItem[];

export const TWOFA_BULK_SECTIONS = [
  { id: "bulk-paste", label: "Paste rows", emoji: "📝", chipClass: "border-amber-400/30 bg-amber-500/15" },
  { id: "bulk-file", label: "File import", emoji: "📂", chipClass: "border-amber-400/30 bg-amber-500/15" },
  { id: "bulk-preview", label: "Preview", emoji: "✓", chipClass: "border-amber-400/30 bg-amber-500/15" },
] as const satisfies readonly OverviewTocItem[];

export function twofaBulkSectionTitle(id: string): string {
  const item = TWOFA_BULK_SECTIONS.find((t) => t.id === id);
  return item ? `${item.emoji} ${item.label}` : id;
}
