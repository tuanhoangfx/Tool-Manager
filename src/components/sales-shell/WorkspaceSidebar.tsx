import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Cookie,
  ExternalLink,
  FileText,
  KeyRound,
  LogOut,
  Mail,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { toolHubUsersUrl } from "../../lib/hub-identity-urls";
import { APP_VERSION } from "../../lib/app-meta";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";
import { ToolAvatar } from "../ToolAvatar";
import { toolIconName, toolSvgIcon } from "../../lib/visual";
import { clearDataBoxSession } from "../../lib/data-box-session";
import { clearTwofaSession } from "../../lib/twofa-session";
import { getTwofaSupabase } from "../../lib/twofa-supabase";
import { clearHubIdentity } from "../../lib/hub-identity-session";
import { useNotesAuth } from "../../features/notes/useNotesAuth";
import { getIdentitySupabase } from "../../lib/supabase-identity";
import { supabase } from "../../lib/supabase";
import {
  requestWorkspaceDataRefresh,
  WORKSPACE_LIST_REFRESHING,
} from "../../lib/workspace-refresh-bus";

const items: { screen: WorkspaceNavScreen; label: string; icon: typeof FileText }[] = [
  { screen: "notes", label: "Notes", icon: FileText },
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

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "";
}

function userDisplay(email: string | null | undefined) {
  return email?.trim() || "Not signed in";
}

export function WorkspaceSidebar({ screen, onNavigate, displayPrefs }: Props) {
  const { session } = useNotesAuth();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);

  useEffect(() => {
    const onRefreshing = (event: Event) => {
      setListRefreshing(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
    return () => window.removeEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
  }, []);
  const user = session?.user ?? null;
  const email = user?.email ?? null;
  const footerUserLabel = email || shortId(user?.id) || "guest";
  const role = String(user?.app_metadata?.role ?? user?.user_metadata?.role ?? "authenticated");
  const provider = String(user?.app_metadata?.provider ?? "email");
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleString("vi-VN") : "—";
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("vi-VN") : "—";
  const initials = useMemo(() => {
    const base = email || user?.id || "U";
    return base.slice(0, 2).toUpperCase();
  }, [email, user?.id]);
  const userModal =
    userModalOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[1300] grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Workspace user information"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setUserModalOpen(false);
            }}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[var(--panel)] shadow-2xl shadow-black/45">
              <div className="relative border-b border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/10 to-emerald-500/10 p-5">
                <button
                  type="button"
                  className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/20 text-[var(--muted)] hover:text-[var(--text)]"
                  onClick={() => setUserModalOpen(false)}
                  aria-label="Close user modal"
                >
                  <X size={15} />
                </button>
                <div className="flex items-center gap-3 pr-10">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-indigo-300/25 bg-indigo-500/20 text-sm font-bold text-indigo-100 shadow-[0_0_28px_rgba(99,102,241,0.2)]">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-200/80">
                      Workspace user
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-[var(--text)]">{userDisplay(email)}</h2>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">{user?.id ?? "No active session"}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-2 p-4 text-sm">
                {[
                  { label: "Email", value: userDisplay(email), icon: Mail },
                  { label: "Role", value: role, icon: ShieldCheck },
                  { label: "Provider", value: provider, icon: KeyRound },
                  { label: "Created", value: createdAt, icon: User },
                  { label: "Last sign in", value: lastSignIn, icon: RefreshCcw },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[.025] px-3 py-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-white/[.04] text-indigo-200">
                        <Icon size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.label}</div>
                        <div className="mt-0.5 truncate font-medium text-[var(--text)]" title={item.value}>{item.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-white/10 p-4">
                <button
                  type="button"
                  className="btn-danger btn flex w-full items-center justify-center gap-2 text-[13px]"
                  disabled={!session || signingOut}
                  onClick={() => {
                    void (async () => {
                      setSigningOut(true);
                      clearHubIdentity();
                      clearDataBoxSession();
                      clearTwofaSession();
                      const identity = getIdentitySupabase();
                      const twofa = getTwofaSupabase();
                      const outs = await Promise.all([
                        identity ? identity.auth.signOut() : Promise.resolve({ error: null }),
                        supabase.auth.signOut(),
                        twofa ? twofa.auth.signOut() : Promise.resolve({ error: null }),
                      ]);
                      setSigningOut(false);
                      const error = outs.find((r) => r.error)?.error;
                      if (error) {
                        window.alert(error.message);
                        return;
                      }
                      window.dispatchEvent(new CustomEvent("p0020:hub-identity"));
                      setUserModalOpen(false);
                    })();
                  }}
                >
                  <LogOut size={15} />
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

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
          <div className="truncate text-sm font-semibold leading-tight">P0020-Data-Box</div>
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
          title="Open workspace user information"
          onClick={() => setUserModalOpen(true)}
          trailing={
            <span className="max-w-[108px] truncate text-xs font-medium text-[var(--text)]/80">
              {footerUserLabel}
            </span>
          }
        />
        <a
          href={toolHubUsersUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={footerBtn}
          title="Workspace users & roles (Tool Hub P0004)"
        >
          <ExternalLink size={15} className="shrink-0 text-indigo-300" />
          <span className="flex-1 text-left">Tool Hub — Users</span>
        </a>
        <SidebarFooterButton
          icon={RefreshCcw}
          iconClass={`text-indigo-300 ${listRefreshing ? "animate-spin" : ""}`}
          label={listRefreshing ? "Updating…" : "Refresh"}
          onClick={() => requestWorkspaceDataRefresh()}
          title={listRefreshing ? "Updating notes in background" : "Refresh notes list"}
        />
        {displayPrefs}
      </footer>
      {userModal}
    </aside>
  );
}
