import { Suspense, useCallback, useEffect, useState } from "react";
import { HubAppLogProvider, resolveHubActiveScreenId, useHubActiveScreenSync } from "@tool-workspace/hub-ui";
import { DisplayPrefs, HubLoaderRoot, WorkspaceLoadingView } from "../../components/sales-shell";
import { WorkspaceSidebar } from "../../components/sales-shell/WorkspaceSidebar";
import { ToastContainer, ToastProvider } from "../../components/toast";
import type { WorkspaceNavScreen, WorkspaceScreen } from "../../lib/workspace-screen";
import { NAV_SCREENS } from "../../lib/workspace-screen";
import { readNoteIdFromUrl } from "../../lib/note-url";
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
import {
  prefetchNotesListBackground,
  prefetchWorkspaceTabsBackground,
} from "../../lib/hub-background-prefetch";
import { EAGER_PRIORITY_SCREENS, WorkspaceEagerTabPrefetch } from "../../lib/workspace-eager-tabs";
import { useExtensionBindingsRelay } from "../cookie/useExtensionBindingsRelay";
import { NotesAuthGate } from "../notes/NotesAuthGate";
import { WorkspaceShellTabFrame } from "./WorkspaceShellTabFrame";
import { WorkspaceVisitedTabPanel } from "./WorkspaceVisitedTabPanel";
import { authVariantForNav } from "./workspace-auth-variant";

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
  const { session, loading: authLoading, offline } = useNotesAuth();
  const { screen, navigate } = useHubNavigation();
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
    prefetchNotesListBackground();
  }, []);

  useEffect(() => {
    if (!session) return;
    prefetchWorkspaceTabsBackground(session);
    setVisited((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const tab of EAGER_PRIORITY_SCREENS) {
        if (!next.has(tab)) {
          next.add(tab);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [session]);

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

  const needsAuthGate = !session && !authLoading && !offline;
  const authGateVariant = authVariantForNav(activeNav);
  /** 2FA is local-first — do not block the tab on Data Box auth boot (deep link /twofa). */
  const authBootBlocking = !session && authLoading && activeNav !== "twofa";

  return (
    <HubAppLogProvider
      activeScreen={activeScreenId}
      bootLog={{ scope: "P0020", message: "Data-Box workspace started", screen: activeScreenId }}
    >
    <WorkspaceEagerTabPrefetch />
    <div className="hub-app theme-hub flex h-full min-h-0 min-h-dvh w-full overflow-hidden">
      <WorkspaceSidebar
        screen={activeNav}
        onNavigate={onNav}
        displayPrefs={<WorkspaceSidebarDisplayPrefs />}
      />

      <main className={mainClass}>
        <HubLoaderRoot />
        {needsAuthGate ? (
          <NotesAuthGate variant={authGateVariant} />
        ) : authBootBlocking ? (
          <div className="flex flex-1 items-center justify-center p-6 text-[12px] text-[var(--muted)]">
            Signing in…
          </div>
        ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkspaceVisitedTabPanel tabId="notes" active={isNotesLayout} visited={visited}>
            <NotesWorkspaceScreen
              tabActive={isNotesLayout}
              navigate={(opts) => navigate("notes", opts)}
            />
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="todo" active={screen === "todo"} visited={visited}>
            <Suspense fallback={<WorkspaceLoadingView screen="todo" enabled={screen === "todo"} />}>
              <TodoScreen tabActive={screen === "todo"} />
            </Suspense>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="twofa" active={screen === "twofa"} visited={visited}>
            <WorkspaceShellTabFrame screen="twofa" active={screen === "twofa"}>
              <Suspense fallback={<WorkspaceLoadingView screen="twofa" enabled={screen === "twofa"} />}>
                <TwofaManagerScreen shellMode tabActive={screen === "twofa"} />
              </Suspense>
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="cookie" active={screen === "cookie"} visited={visited}>
            <WorkspaceShellTabFrame screen="cookie" active={screen === "cookie"}>
              <Suspense fallback={<WorkspaceLoadingView screen="cookie" enabled={screen === "cookie"} />}>
                <CookieSyncScreen shellMode tabActive={screen === "cookie"} />
              </Suspense>
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>

          <WorkspaceVisitedTabPanel tabId="system" active={screen === "system"} visited={visited}>
            <WorkspaceShellTabFrame screen="system" active={screen === "system"}>
              <Suspense fallback={<WorkspaceLoadingView screen="system" enabled={screen === "system"} />}>
                <SystemDesignTemplateScreen />
              </Suspense>
            </WorkspaceShellTabFrame>
          </WorkspaceVisitedTabPanel>
        </div>
        )}
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
