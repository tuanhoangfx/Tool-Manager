import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { useAppToast } from "../toast";
import { compactIconSize } from "../../lib/ui-scale";
import {
  HUB_SIDEBAR_FOOTER_BTN_CLASS,
  HubLogButton,
  HubSidebarFooterButton,
  HubToolDetailModal,
  HubToolDetailModalPrimaryAction,
  HubUiZoomControl,
} from "@tool-workspace/hub-ui";

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

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "";
}

function userDisplay(email: string | null | undefined) {
  return email?.trim() || "Not signed in";
}

export function WorkspaceSidebar({ screen, onNavigate, displayPrefs }: Props) {
  const { session } = useNotesAuth();
  const { pushToast } = useAppToast();
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
  const signOut = () => {
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
        pushToast(error.message, "error", 8000);
        return;
      }
      window.dispatchEvent(new CustomEvent("p0020:hub-identity"));
      setUserModalOpen(false);
    })();
  };

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
              <Icon size={compactIconSize(16)} className={active ? "text-indigo-300" : ""} />
              <span className="flex-1 text-left">{label}</span>
            </button>
          );
        })}
      </nav>

      <footer className="mt-2 shrink-0 space-y-0.5 overflow-visible border-t border-white/5 pt-2.5">
        <HubSidebarFooterButton
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
          className={HUB_SIDEBAR_FOOTER_BTN_CLASS}
          title="Workspace users & roles (Tool Hub P0004)"
        >
          <ExternalLink size={compactIconSize(15)} className="shrink-0 text-indigo-300" />
          <span className="flex-1 text-left">Tool Hub — Users</span>
        </a>
        <HubSidebarFooterButton
          icon={RefreshCcw}
          iconClass={`text-indigo-300 ${listRefreshing ? "animate-spin" : ""}`}
          label={listRefreshing ? "Updating…" : "Refresh"}
          onClick={() => requestWorkspaceDataRefresh()}
          title={listRefreshing ? "Updating notes in background" : "Refresh notes list"}
        />
        <HubLogButton variant="global" />
        {displayPrefs}
        <HubUiZoomControl />
      </footer>
      <HubToolDetailModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={userDisplay(email)}
        titleId="workspace-user-modal-title"
        headerLeading={
          <span
            className="user-access-modal__avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-indigo-300/25 bg-indigo-500/20 text-xs font-bold text-indigo-100"
            aria-hidden
          >
            {initials}
          </span>
        }
        shellClassName="hub-header-panel-modal hub-tool-detail-modal--fit"
        ariaLabelledBy="workspace-user-modal-title"
        footer={
          <HubToolDetailModalPrimaryAction
            label={signingOut ? "Signing out…" : "Sign Out"}
            onClick={signOut}
            disabled={!session || signingOut}
            busy={signingOut}
            danger
            icon={LogOut}
          />
        }
      >
        <div className="space-y-3 px-1">
          <p className="font-mono text-[10px] text-[var(--muted)]">{user?.id ?? "No active session"}</p>
          <div className="grid gap-2 text-sm">
            {[
              { label: "Email", value: userDisplay(email), icon: Mail },
              { label: "Role", value: role, icon: ShieldCheck },
              { label: "Provider", value: provider, icon: KeyRound },
              { label: "Created", value: createdAt, icon: User },
              { label: "Last sign in", value: lastSignIn, icon: RefreshCcw },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.025] px-3 py-2.5"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/[.04] text-indigo-200">
                    <Icon size={compactIconSize(14)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">{item.label}</div>
                    <div className="mt-0.5 truncate font-medium text-[var(--text)]" title={item.value}>
                      {item.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HubToolDetailModal>
    </aside>
  );
}
