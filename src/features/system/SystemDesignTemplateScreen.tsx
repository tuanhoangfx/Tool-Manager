import { Search, Settings2 } from "lucide-react";
import { Glass } from "../../theme/p0008";

export function SystemDesignTemplateScreen() {
  return (
    <div className="space-y-4">
      <Glass tone="purple">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">System</p>
            <h1 className="mt-1 text-xl font-semibold">Design Template</h1>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Active review work appears here before production UI changes.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1.5 text-xs text-purple-100">
            <Settings2 size={14} />
            P0020 template gate
          </span>
        </div>
      </Glass>

      <Glass tone="slate">
        <div className="rounded-2xl border border-white/5 bg-[var(--panel)] p-3">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="field w-full"
              style={{ paddingLeft: 34 }}
              placeholder="Search active designs..."
              disabled
            />
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[.02] px-4 py-10 text-center">
          <p className="text-sm font-semibold text-[var(--text)]">No active designs</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Selected templates were promoted to production and preview scaffolding has been removed.
          </p>
        </div>
      </Glass>
    </div>
  );
}
