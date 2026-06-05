import type { HubShortcutId } from "./hub-keyboard-shortcuts";
import { HUB_SHORTCUT_LEGEND } from "./hub-keyboard-shortcuts";

// Footer-only: keep it short and scannable (2–4 key items).
const QUICK_IDS: HubShortcutId[] = ["search", "clear", "settings", "dismiss"];

export function HubKeyboardQuickHints({ className = "" }: { className?: string }) {
  const quick = HUB_SHORTCUT_LEGEND.filter((s) => QUICK_IDS.includes(s.id));

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-[var(--muted)] ${className}`}
      aria-label="Quick keyboard shortcuts"
    >
      <span className="whitespace-nowrap font-semibold text-[10px] text-[var(--text)]/90">
        Quick
      </span>
      {quick.map((s) => (
        <span key={s.id} className="inline-flex items-center gap-1 whitespace-nowrap">
          <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono text-[9px] text-indigo-200/90">
            {s.keys}
          </kbd>
          <span>{s.label}</span>
        </span>
      ))}
    </div>
  );
}

