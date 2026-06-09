import { useEffect, useState, type ReactNode } from "react";
import { RefreshCcw } from "lucide-react";
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
  HubWorkspaceUserShell,
  useNavGroupOpenState,
} from "@tool-workspace/hub-ui";
import { NAV_STRUCTURE, NAV_SUBNAV_PREFIX } from "../../lib/nav-structure";
import { prefetchWorkspaceTab } from "../../lib/workspace-tab-prefetch";

const EMPTY_GROUP_IDS: readonly string[] = [];

type Props = {
  screen: WorkspaceNavScreen;
  onNavigate: (screen: WorkspaceNavScreen) => void;
  displayPrefs?: ReactNode;
};

export function WorkspaceSidebar({ screen, onNavigate, displayPrefs }: Props) {
  const { session, offline } = useNotesAuth();
  const { pushToast } = useAppToast();
  const [listRefreshing, setListRefreshing] = useState(false);
  const { groupOpen, setGroupSubnavOpen } = useNavGroupOpenState(NAV_SUBNAV_PREFIX, EMPTY_GROUP_IDS);

  useEffect(() => {
    const onRefreshing = (event: Event) => {
      setListRefreshing(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
    return () => window.removeEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
  }, []);

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
          onPrefetchScreen={prefetchWorkspaceTab}
          onSelectView={() => {}}
        />
      </nav>

      <footer className="mt-2 shrink-0 space-y-0.5 overflow-visible border-t border-white/5 pt-2.5">
        <HubWorkspaceUserShell
          session={session}
          anonymous={offline}
          footerTitle="Open workspace user information"
          emptyEmailLabel="Not signed in"
          workspaceNote={
            offline
              ? "Anonymous mode — cloud vault sync requires sign-in."
              : "Workspace data syncs per signed-in user on Data Box Supabase."
          }
          onSignOut={async () => {
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
            const error = outs.find((r) => r.error)?.error;
            if (error) {
              pushToast(error.message, "error", 8000);
              return false;
            }
            window.dispatchEvent(new CustomEvent("p0020:hub-identity"));
            return true;
          }}
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
    </aside>
  );
}
