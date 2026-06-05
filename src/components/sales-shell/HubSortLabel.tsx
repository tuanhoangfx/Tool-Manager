import { ArrowDownWideNarrow } from "lucide-react";

/** Toolbar chip — current list sort (matches `HubResultCount` height). */
export function HubSortLabel({ label }: { label: string }) {
  return (
    <span
      className="inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 text-xs font-medium text-violet-100 shadow-sm shadow-violet-500/10"
      title={`Sorted by ${label}`}
    >
      <ArrowDownWideNarrow size={14} className="shrink-0 text-violet-300/90" />
      {label}
    </span>
  );
}
