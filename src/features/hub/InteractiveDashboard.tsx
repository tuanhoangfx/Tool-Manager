import { Activity, Cookie, Library, ListTodo, Monitor, Share2, Shield, StickyNote } from "lucide-react";
import { Glass } from "../../theme/p0008";
import type { AppScreen } from "../design-preview/types";

type Tile = {
  screen: AppScreen;
  label: string;
  desc: string;
  icon: typeof Library;
  tone: keyof typeof TONE_CLASS;
  group: string;
};

const TONE_CLASS = {
  indigo: "from-indigo-500/15 border-indigo-400/30",
  emerald: "from-emerald-500/15 border-emerald-400/30",
  amber: "from-amber-500/15 border-amber-400/30",
  cyan: "from-cyan-500/15 border-cyan-400/30",
  slate: "from-slate-500/15 border-slate-400/30",
} as const;

const TILES: Tile[] = [
  { screen: "library", label: "Tool Library", desc: "P0004 catalog — theme P0008", icon: Library, tone: "indigo", group: "P0004" },
  { screen: "activity", label: "Activity", desc: "Commit timeline", icon: Activity, tone: "cyan", group: "P0004" },
  { screen: "system", label: "System", desc: "Sync hub & drift", icon: Monitor, tone: "slate", group: "P0004" },
  { screen: "notes", label: "Notes", desc: "V5 gallery + cookie", icon: StickyNote, tone: "indigo", group: "Apps" },
  { screen: "todo", label: "Todo", desc: "Kanban P0019", icon: ListTodo, tone: "emerald", group: "Apps" },
  { screen: "twofa", label: "2FA", desc: "TOTP Ivmo-style", icon: Shield, tone: "amber", group: "Apps" },
  { screen: "cookie", label: "Cookie Auto", desc: "Sync → note", icon: Cookie, tone: "amber", group: "Apps" },
  { screen: "share", label: "Share", desc: "Link mã hóa note", icon: Share2, tone: "indigo", group: "Apps" },
];

export function InteractiveDashboard({ onNavigate }: { onNavigate: (s: AppScreen) => void }) {
  const groups = ["P0004", "Apps"] as const;

  return (
    <div className="anim-fade">
      <header className="mb-6 border-b border-white/10 pb-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bấm ô bên dưới để mở từng chức năng — <strong className="text-indigo-200">không reload</strong>, cùng theme P0008.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group} className="mb-8">
          <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{group}</h2>
          <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TILES.filter((t) => t.group === group).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.screen}
                  type="button"
                  onClick={() => onNavigate(t.screen)}
                  className={`anim-pop flex flex-col items-start rounded-xl border bg-gradient-to-br ${TONE_CLASS[t.tone]} to-transparent p-4 text-left transition-transform hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/10`}
                >
                  <Icon size={22} className="mb-2 text-indigo-300" />
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="mt-1 text-[11px] text-[var(--muted)]">{t.desc}</span>
                  <span className="mt-3 text-[10px] text-indigo-300">Mở →</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <Glass tone="slate" className="!p-3">
        <p className="text-[11px] text-[var(--muted)]">
          Layout <strong className="text-indigo-200">H1 Unified Sidebar</strong> — sidebar trái, main đổi theo mục chọn.
          Notes → thẻ → Chỉnh sửa.
        </p>
      </Glass>
    </div>
  );
}
