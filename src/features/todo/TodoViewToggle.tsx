import { Briefcase, ClipboardList } from "lucide-react";
import type { TodoAdminView } from "@/todo/app-types";
import { useSettings } from "@/todo/context/SettingsContext";

type Props = {
  activeView: TodoAdminView;
  onViewChange: (view: TodoAdminView) => void;
  showAdminViews: boolean;
};

/** Hub-styled admin view toggle — My Tasks | All Tasks (no Management). */
export function TodoViewToggle({ activeView, onViewChange, showAdminViews }: Props) {
  const { t } = useSettings();
  if (!showAdminViews) return null;

  const items = [
    { view: "myTasks" as const, label: t.employeeDashboard, icon: Briefcase },
    { view: "taskDashboard" as const, label: t.adminDashboard, icon: ClipboardList },
  ];

  return (
    <div className="flex items-center rounded-full border border-white/10 bg-[var(--panel-2)] p-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.view;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => onViewChange(item.view)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              active
                ? "bg-[var(--panel)] text-[var(--accent)] shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
            title={item.label}
          >
            <Icon size={14} aria-hidden />
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
