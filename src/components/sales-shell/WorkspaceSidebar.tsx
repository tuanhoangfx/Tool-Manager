import type { ReactNode } from "react";
import { Cookie, FileText, KeyRound, ListTodo, RefreshCcw, Settings2, User } from "lucide-react";
import { APP_USER_LABEL, APP_VERSION } from "../../lib/app-meta";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";
import { ToolAvatar } from "../ToolAvatar";
import { toolIconName, toolSvgIcon } from "../../lib/visual";

const items: { screen: WorkspaceNavScreen; label: string; icon: typeof FileText }[] = [
  { screen: "notes", label: "Notes", icon: FileText },
  { screen: "todo", label: "Todo", icon: ListTodo },
  { screen: "twofa", label: "2FA", icon: KeyRound },
  { screen: "cookie", label: "Cookie Auto", icon: Cookie },
  { screen: "system", label: "System", icon: Settings2 },
];

type Props = {
  screen: WorkspaceNavScreen;
  onNavigate: (screen: WorkspaceNavScreen) => void;
  displayPrefs?: ReactNode;
};

const footerBtn =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-60";

function SidebarFooterButton({
  icon: Icon,
  label,
  iconClass,
  onClick,
  disabled,
  title,
  trailing,
}: {
  icon: typeof RefreshCcw;
  label: string;
  iconClass: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  trailing?: ReactNode;
}) {
  return (
    <button type="button" className={footerBtn} onClick={onClick} disabled={disabled} title={title}>
      <Icon size={15} className={`shrink-0 ${iconClass}`} />
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  );
}

export function WorkspaceSidebar({ screen, onNavigate, displayPrefs }: Props) {
  return (
    <aside className="flex h-full min-h-0 w-60 shrink-0 flex-col overflow-visible border-r border-white/5 bg-[var(--panel)] p-4">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <ToolAvatar
          code="P0020"
          iconName={toolIconName({ code: "P0020" })}
          svgSrc={toolSvgIcon({ code: "P0020" }) ?? undefined}
          size="md"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">Workspace Tools</div>
          <div className="text-[10px] text-[var(--muted)]">P0020 · v{APP_VERSION}</div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {items.map(({ screen: id, label, icon: Icon }) => {
          const active = screen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all ${
                active
                  ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/5 text-indigo-100"
                  : "text-[var(--muted)] hover:bg-white/5 hover:text-[var(--text)]"
              }`}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-indigo-400" />
              ) : null}
              <Icon size={16} className={active ? "text-indigo-300" : ""} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          );
        })}
      </nav>

      <footer className="mt-2 shrink-0 space-y-0.5 overflow-visible border-t border-white/5 pt-2.5">
        <SidebarFooterButton
          icon={User}
          iconClass="text-violet-400"
          label="User"
          title="Current workspace user"
          disabled
          trailing={<span className="text-xs font-medium text-[var(--text)]/80">{APP_USER_LABEL}</span>}
        />
        <SidebarFooterButton
          icon={RefreshCcw}
          iconClass="text-indigo-300"
          label="Refresh"
          onClick={() => window.location.reload()}
          title="Refresh workspace"
        />
        {displayPrefs}
      </footer>
    </aside>
  );
}
