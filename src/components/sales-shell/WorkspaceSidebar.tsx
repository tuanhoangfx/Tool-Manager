import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Mail,
  RefreshCcw,
  ShieldCheck,
  User,
  KeyRound,
} from "lucide-react";
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
import {
  HubLogButton,
  HubSidebarFooterButton,
  HubSidebarNavList,
  HubUiZoomControl,
  HubWorkspaceUserModal,
  useNavGroupOpenState,
} from "@tool-workspace/hub-ui";
import { NAV_STRUCTURE, NAV_SUBNAV_PREFIX } from "../../lib/nav-structure";

const EMPTY_GROUP_IDS: readonly string[] = [];

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
  const { session, offline } = useNotesAuth();
  const { pushToast } = useAppToast();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const { groupOpen, setGroupSubnavOpen } = useNavGroupOpenState(NAV_SUBNAV_PREFIX, EMPTY_GROUP_IDS);

  useEffect(() => {
    const onRefreshing = (event: Event) => {
      setListRefreshing(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
    return () => window.removeEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
  }, []);
  const user = session?.user ?? null;
  const email = user?.email ?? null;
  const footerUserLabel = offline
    ? "Anonymous"
    : email || shortId(user?.id) || "guest";
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
        <HubSidebarNavList
          structure={NAV_STRUCTURE}
          activeScreen={screen}
          groupOpen={groupOpen}
          setGroupSubnavOpen={setGroupSubnavOpen}
          showToggleIcon={false}
          onNavigateScreen={onNavigate}
          onSelectView={() => {}}
        />
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
        <HubSidebarFooterButton
          icon={RefreshCcw}
          iconClass={`text-emerald-300 ${listRefreshing ? "animate-spin" : ""}`}
          label={listRefreshing ? "Updating…" : "Refresh"}
          onClick={() => requestWorkspaceDataRefresh()}
          title={listRefreshing ? "Updating notes in background" : "Refresh notes list"}
        />
        <HubLogButton variant="global" />
        {displayPrefs}
        <HubUiZoomControl />
      </footer>
      <HubWorkspaceUserModal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={userDisplay(email)}
        headerLeading={
          <span
            className="user-access-modal__avatar grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-indigo-300/25 bg-indigo-500/20 text-xs font-bold text-indigo-100"
            aria-hidden
          >
            {initials}
          </span>
        }
        userId={user?.id ?? null}
        sessionActive={Boolean(session)}
        signingOut={signingOut}
        onSignOut={signOut}
        workspaceNote={
          offline
            ? "Anonymous mode — cloud vault sync requires sign-in."
            : "Workspace data syncs per signed-in user on Data Box Supabase."
        }
        rows={[
          { label: "Email", value: userDisplay(email), icon: Mail },
          { label: "Role", value: role, icon: ShieldCheck },
          { label: "Provider", value: provider, icon: KeyRound },
          { label: "Created", value: createdAt, icon: User },
          { label: "Last sign in", value: lastSignIn, icon: RefreshCcw },
        ]}
      />
    </aside>
  );
}
