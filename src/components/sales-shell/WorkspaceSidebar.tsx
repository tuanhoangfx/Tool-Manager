import { useEffect, useState, type ReactNode } from "react";
import { RefreshCcw } from "lucide-react";
import type { WorkspaceNavScreen } from "../../lib/workspace-screen";
import { ToolAvatar } from "../ToolAvatar";
import { toolIconName, toolSvgIcon } from "../../lib/visual";
import { DATA_BOX_PRODUCT } from "../../lib/app-meta";
import { clearDataBoxSession } from "../../lib/data-box-session";
import { setOfflineMode } from "../../lib/offlineMode";
import { clearTwofaSession } from "../../lib/twofa-session";
import { getTwofaSupabase } from "../../lib/twofa-supabase";
import { clearHubIdentity } from "../../lib/hub-identity-session";
import { useNotesAuth } from "../../features/notes/AuthSessionProvider";
import { applyHubIdentitySession, getIdentitySupabase } from "../../lib/supabase-identity";
import { supabase } from "../../lib/supabase";
import { warmWorkspaceRoleForSession } from "../../lib/workspace-role-ssot";
import {
  requestWorkspaceDataRefresh,
  WORKSPACE_LIST_REFRESHING,
} from "../../lib/workspace-refresh-bus";
import { useAppToast } from "../toast";
import {
  HubLogButton,
  HubSidebarFooterButton,
  HubSidebarNavList,
  HubSidebarShell,
  HubUiZoomControl,
  HubWorkspaceUserShell,
  clearWorkspaceProfileRoleCache,
  useNavGroupOpenState,
} from "@tool-workspace/hub-ui";
import { NAV_STRUCTURE, NAV_GROUP_IDS, NAV_SUBNAV_PREFIX } from "../../lib/nav-structure";
import { prefetchSystemTab } from "../../lib/system-tab-prefetch";
import { prefetchWorkspaceTab } from "../../lib/workspace-tab-prefetch";
import { readTwofaVaultView, setTwofaVaultView } from "../../lib/twofa-vault-path";
import type { TwofaVaultView } from "../../lib/twofa-vault-path";

const NAV_GROUP_OPEN_IDS = [...NAV_GROUP_IDS];

type Props = {
  screen: WorkspaceNavScreen;
  onNavigate: (screen: WorkspaceNavScreen) => void;
  displayPrefs?: ReactNode;
};

export function WorkspaceSidebar({ screen, onNavigate, displayPrefs }: Props) {
  const { session, offline, hubUserId, hubEmail } = useNotesAuth();
  const { pushToast } = useAppToast();
  const [listRefreshing, setListRefreshing] = useState(false);
  const [twofaVaultView, setTwofaVaultViewState] = useState<TwofaVaultView>(() => readTwofaVaultView());
  const { groupOpen, setGroupSubnavOpen } = useNavGroupOpenState(NAV_SUBNAV_PREFIX, NAV_GROUP_OPEN_IDS);

  useEffect(() => {
    const onPop = () => setTwofaVaultViewState(readTwofaVaultView());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onRefreshing = (event: Event) => {
      setListRefreshing(Boolean((event as CustomEvent<boolean>).detail));
    };
    window.addEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
    return () => window.removeEventListener(WORKSPACE_LIST_REFRESHING, onRefreshing);
  }, []);

  useEffect(() => {
    if (!session?.user?.id || offline) return;
    void warmWorkspaceRoleForSession(session, {
      hubUserId,
      hubEmail: hubEmail ?? session.user.email,
    });
  }, [session, hubUserId, hubEmail, offline]);

  return (
    <HubSidebarShell
      brandLeading={
        <ToolAvatar
          code={DATA_BOX_PRODUCT.code}
          iconName={toolIconName({ code: DATA_BOX_PRODUCT.code })}
          svgSrc={toolSvgIcon({ code: DATA_BOX_PRODUCT.code }) ?? undefined}
          size="md"
        />
      }
      brandTitle={DATA_BOX_PRODUCT.name}
      nav={
        <HubSidebarNavList
          structure={NAV_STRUCTURE}
          activeScreen={screen}
          activeView={screen === "twofa" ? twofaVaultView : undefined}
          groupOpen={groupOpen}
          setGroupSubnavOpen={setGroupSubnavOpen}
          showToggleIcon={false}
          onNavigateScreen={onNavigate}
          onPrefetchScreen={(next) => {
            prefetchWorkspaceTab(next);
            if (next === "system") prefetchSystemTab();
          }}
          onSelectView={(view) => {
            setTwofaVaultView(view);
            setTwofaVaultViewState(view);
          }}
          onPrefetchView={() => {
            prefetchWorkspaceTab("twofa");
          }}
        />
      }
      footer={
        <>
          <HubWorkspaceUserShell
            session={session}
            anonymous={offline}
            profileRoleClient={getIdentitySupabase()}
            profileRoleUserId={hubUserId}
            profileRoleEmail={hubEmail ?? session?.user?.email}
            onPrepareProfileRoleClient={async () => {
              await applyHubIdentitySession();
            }}
            footerTitle="Open workspace user information"
            emptyEmailLabel="Not signed in"
            workspaceNote={
              offline
                ? "Anonymous mode — cloud vault sync requires sign-in."
                : "Workspace data syncs per signed-in user on Data Box Supabase."
            }
            onSignOut={async () => {
              setOfflineMode(false);
              clearWorkspaceProfileRoleCache();
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
        </>
      }
    />
  );
}
