import { Search, Settings2 } from "lucide-react";
import { Glass } from "../../../theme/p0008";

/** Design previews removed after Notes list rail locked to V1. */
export function DesignTemplatePage() {
  return (
    <div className="design-template-page space-y-4 pb-10">
      <Glass tone="purple">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">System</p>
            <h1 className="mt-1 text-xl font-semibold">Design Template</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Notes list rail — locked to <strong className="text-purple-200">V1</strong> (title-only + cookie route
              icon).
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1.5 text-xs text-purple-100">
            <Settings2 size={14} />
            No active reviews
          </span>
        </div>
      </Glass>

      <Glass tone="slate">
        <div className="rounded-2xl border border-white/5 bg-[var(--panel)] p-3">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="field w-full opacity-60"
              style={{ paddingLeft: 34 }}
              placeholder="Search active designs..."
              disabled
            />
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-4 py-10 text-center">
          <p className="text-sm font-semibold text-[var(--text)]">No active designs</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Production: <code className="text-indigo-300">NotesListRail.tsx</code> — Design V1.
          </p>
        </div>
      </Glass>
    </div>
  );
}
