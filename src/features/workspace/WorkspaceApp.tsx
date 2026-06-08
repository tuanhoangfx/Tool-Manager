import { useCallback, useEffect, useState } from "react";
import { HubAppLogProvider, resolveHubActiveScreenId, useHubActiveScreenSync } from "@tool-workspace/hub-ui";
import { DisplayPrefs, HubLoaderRoot } from "../../components/sales-shell";
import { hideBootLoader } from "../../lib/hide-boot-loader";
import { WorkspaceSidebar } from "../../components/sales-shell/WorkspaceSidebar";
import { ToastContainer, ToastProvider } from "../../components/toast";
import type { WorkspaceNavScreen, WorkspaceScreen } from "../../lib/workspace-screen";
import { NAV_SCREENS } from "../../lib/workspace-screen";
import { readNoteIdFromUrl } from "../design-preview/design-nav";
import { useHubIdentityRelay } from "../hub/useHubIdentityRelay";
import { useHubNavigation } from "../hub/useHubNavigation";
import { AuthSessionProvider } from "../notes/AuthSessionProvider";
import { useNotesAuth } from "../notes/useNotesAuth";
import { useExtensionSessionRelay } from "../notes/useExtensionSessionRelay";
import { NotesWorkspaceScreen } from "../notes/NotesWorkspaceScreen";
import { TwofaManagerScreen } from "../twofa/TwofaManagerScreen";
import { CookieSyncScreen } from "../cookie/CookieSyncScreen";
import { SystemDesignTemplateScreen } from "../system/SystemDesignTemplateScreen";
import { prefetchNotesListBackground } from "../../lib/hub-background-prefetch";
import { useExtensionBindingsRelay } from "../cookie/useExtensionBindingsRelay";
import { WorkspaceShellTabFrame } from "./WorkspaceShellTabFrame";
import { WorkspaceVisitedTabPanel } from "./WorkspaceVisitedTabPanel";

function WorkspaceSidebarDisplayPrefs() {
  return (
    <DisplayPrefs
      showRange={false}
      showLimit={false}
      showHeaderPin
      sidebarRow
      scope="global"
    />
  );
}

function navScreen(screen: WorkspaceScreen): WorkspaceNavScreen {
  if (screen === "edit") return "notes";
  if (NAV_SCREENS.includes(screen as WorkspaceNavScreen)) return screen as WorkspaceNavScreen;
  return "notes";
}

const NOTES_SCREENS = new Set<WorkspaceScreen>(["notes", "edit"]);

function WorkspaceAppInner() {
  const { session } = useNotesAuth();
  const { screen, navigate } = useHubNavigation();
  useHubIdentityRelay();
  useExtensionBindingsRelay(true);
  useExtensionSessionRelay(session);
  const activeNav = navScreen(screen);
  useHubActiveScreenSync(activeNav);
  const activeScreenId = resolveHubActiveScreenId(activeNav);
  const isNotesLayout = NOTES_SCREENS.has(screen);
  const [visited, setVisited] = useState<Set<WorkspaceNavScreen>>(() => new Set([activeNav]));

  useEffect(() => {
    if (screen !== "edit") return;
    const note = readNoteIdFromUrl();
    navigate("notes", { note: note ?? undefined, replace: true });
  }, [screen, navigate]);

  useEffect(() => {
    setVisited((prev) => new Set(prev).add(activeNav));
  }, [activeNav]);

  useEffect(() => {
    hideBootLoader();
    prefetchNotesListBackground();
    const idle = window.requestIdleCallback?.(() => prefetchNotesListBackground(), { timeout: 2000 });
    if (idle == null) {
      const t = window.setTimeout(() => prefetchNotesListBackground(), 400);
      return () => window.clearTimeout(t);
    }
    return () => window.cancelIdleCallback(idle);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("theme-hub");
    document.documentElement.classList.add("fonts-loaded");
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.background = "var(--bg)";
    document.body.style.color = "var(--text)";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const onNav = useCallback(
    (next: WorkspaceNavScreen) => {
      navigate(next);
    },
    [navigate],
  );

  const mainClass = isNotesLayout
    ? "hub-main hub-main--notes flex-1 min-h-0 min-w-0 flex-col overflow-hidden"
    : "hub-main flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden";

  return (
    <HubAppLogProvider
      activeScreen={activeScreenId}
      bootLog={{ scope: "P0020", message: "Data-Box workspace started", screen: activeScreenId }}
    >
    <div className="hub-app theme-hub flex h-full min-h-0 w-full overflow-hidden">
      <WorkspaceSidebar
        screen={activeNav}
        onNavigate={onNav}
        displayPrefs={<WorkspaceSidebarDisplayPrefs />}
      />

      <main className={mainClass}>
        <HubLoaderRoot />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkspaceVisitedTabPanel tabId="notes" active={isNotesLayout} visited={visited}>
            <NotesWorkspaceScreen
              tabActive={isNotesLayout}
              navigate={(opts) => navigate("notes", opts)}
            />
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="twofa" active={screen === "twofa"} visited={visited}>
            <WorkspaceShellTabFrame screen="twofa" active={screen === "twofa"}>
              <TwofaManagerScreen shellMode />
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="cookie" active={screen === "cookie"} visited={visited}>
            <WorkspaceShellTabFrame screen="cookie" active={screen === "cookie"}>
              <CookieSyncScreen shellMode tabActive={screen === "cookie"} />
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="system" active={screen === "system"} visited={visited}>
            <WorkspaceShellTabFrame screen="system" active={screen === "system"}>
              <SystemDesignTemplateScreen />
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>
        </div>
      </main>
      <ToastContainer />
    </div>
    </HubAppLogProvider>
  );
}

export function WorkspaceApp() {
  return (
    <ToastProvider>
      <AuthSessionProvider>
        <WorkspaceAppInner />
      </AuthSessionProvider>
    </ToastProvider>
  );
}
