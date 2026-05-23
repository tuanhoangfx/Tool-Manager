import type { ReactNode } from "react";
import {
  Activity,
  Cookie,
  LayoutDashboard,
  Library,
  ListTodo,
  Monitor,
  Settings,
  Shield,
  StickyNote,
} from "lucide-react";
import type { AppScreen } from "../../features/design-preview/types";
import { SCREEN_LABELS } from "../../features/design-preview/types";

type NavItem = { id: AppScreen; label: string; icon: typeof LayoutDashboard; group: string };

const ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Home" },
  { id: "library", label: SCREEN_LABELS.library, icon: Library, group: "P0004" },
  { id: "activity", label: SCREEN_LABELS.activity, icon: Activity, group: "P0004" },
  { id: "system", label: SCREEN_LABELS.system, icon: Monitor, group: "P0004" },
  { id: "notes", label: SCREEN_LABELS.notes, icon: StickyNote, group: "Apps" },
  { id: "todo", label: SCREEN_LABELS.todo, icon: ListTodo, group: "Apps" },
  { id: "twofa", label: SCREEN_LABELS.twofa, icon: Shield, group: "Apps" },
  { id: "cookie", label: SCREEN_LABELS.cookie, icon: Cookie, group: "Apps" },
  { id: "settings", label: SCREEN_LABELS.settings, icon: Settings, group: "System" },
];

export function P0008Sidebar({
  active = "dashboard",
  onNavigate,
  children,
}: {
  active?: AppScreen;
  onNavigate: (screen: AppScreen) => void;
  children: ReactNode;
}) {
  let lastGroup = "";

  return (
    <div className="p0008-skin flex h-screen min-h-0 bg-[var(--bg)] text-[var(--text)]">
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-white/5 bg-[var(--panel)] p-3 lg:w-60">
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold shadow-lg shadow-blue-500/30">
            T
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Tool Manager</div>
            <div className="text-[10px] text-[var(--muted)]">P0020 · P0008</div>
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto">
          {ITEMS.map(({ id, label, icon: Icon, group }) => {
            const showGroup = group !== lastGroup;
            lastGroup = group;
            const isActive = id === active;
            return (
              <div key={id}>
                {showGroup ? (
                  <div className="mb-1 mt-2 px-2 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)] first:mt-0">
                    {group}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={`relative flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[12px] transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/5 text-indigo-100"
                      : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
                  }`}
                >
                  {isActive ? (
                    <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-indigo-400" />
                  ) : null}
                  <Icon size={15} className={isActive ? "text-indigo-300" : ""} />
                  <span className="flex-1 truncate">{label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        <p className="mt-3 text-[10px] text-[var(--muted)]">
          Active: <strong className="text-indigo-200">{SCREEN_LABELS[active]}</strong>
        </p>
      </aside>

      <main className="custom-scrollbar flex h-full min-h-0 flex-1 flex-col overflow-auto p-4 lg:p-6">{children}</main>
    </div>
  );
}
