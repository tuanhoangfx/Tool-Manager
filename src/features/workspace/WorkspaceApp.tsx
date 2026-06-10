import { Suspense, useCallback, useEffect, useState } from "react";
import { HubAppLogProvider, resolveHubActiveScreenId, useHubActiveScreenSync } from "@tool-workspace/hub-ui";
import { DisplayPrefs, HubLoaderRoot, WorkspaceLoadingView } from "../../components/sales-shell";
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
import {
  CookieSyncScreen,
  SystemDesignTemplateScreen,
  TodoScreen,
  TwofaManagerScreen,
} from "./workspace-lazy-screens";
import { prefetchNotesListBackground } from "../../lib/hub-background-prefetch";
import { setupHubUiFilterIcons } from "../../lib/hub-ui-setup";
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
    if (activeNav === "twofa" || activeNav === "cookie") setupHubUiFilterIcons();
  }, [activeNav]);

  useEffect(() => {
    hideBootLoader();
    prefetchNotesListBackground();
    const warm = () => prefetchNotesListBackground();
    const idle = window.requestIdleCallback?.(warm, { timeout: 2000 });
    if (idle == null) {
      const t = window.setTimeout(warm, 400);
      return () => window.clearTimeout(t);
    }
    return () => window.cancelIdleCallback(idle);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("theme-hub");
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
    <div className="hub-app theme-hub flex h-full min-h-0 min-h-dvh w-full overflow-hidden">
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

          <WorkspaceVisitedTabPanel tabId="todo" active={screen === "todo"} visited={visited}>
            <Suspense fallback={<WorkspaceLoadingView screen="todo" variant="overlay" />}>
              <TodoScreen tabActive={screen === "todo"} />
            </Suspense>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="twofa" active={screen === "twofa"} visited={visited}>
            <WorkspaceShellTabFrame screen="twofa" active={screen === "twofa"}>
              <Suspense fallback={<WorkspaceLoadingView screen="twofa" variant="overlay" />}>
                <TwofaManagerScreen shellMode />
              </Suspense>
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="cookie" active={screen === "cookie"} visited={visited}>
            <WorkspaceShellTabFrame screen="cookie" active={screen === "cookie"}>
              <Suspense fallback={<WorkspaceLoadingView screen="cookie" variant="overlay" />}>
                <CookieSyncScreen shellMode tabActive={screen === "cookie"} />
              </Suspense>
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="system" active={screen === "system"} visited={visited}>
            <WorkspaceShellTabFrame screen="system" active={screen === "system"}>
              <Suspense fallback={<WorkspaceLoadingView screen="system" variant="overlay" />}>
                <SystemDesignTemplateScreen />
              </Suspense>
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
