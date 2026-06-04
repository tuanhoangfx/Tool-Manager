import { useCallback, useEffect, useState } from "react";
import { DisplayPrefs, HubLoaderRoot } from "../../components/sales-shell";
import { hideBootLoader } from "../../lib/hide-boot-loader";
import type { FilterDef } from "../../components/sales-shell/FilterBar";
import { WorkspaceSidebar } from "../../components/sales-shell/WorkspaceSidebar";
import { ToastContainer, ToastProvider } from "../../components/toast";
import type { WorkspaceNavScreen, WorkspaceScreen } from "../../lib/workspace-screen";
import { NAV_SCREENS } from "../../lib/workspace-screen";
import { readNoteIdFromUrl } from "../design-preview/design-nav";
import { DEFAULT_NOTES_FILTER_KEYS } from "../notes/notes-list-prefs";
import { NOTES_FILTER_DEFS } from "../notes/notes-filters";
import { COOKIE_ROUTE_FILTER_DEFS, DEFAULT_COOKIE_ROUTE_FILTER_KEYS } from "../cookie/cookie-route-filters";
import { useExtensionBindingsRelay } from "../cookie/useExtensionBindingsRelay";
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
import { WorkspaceLogProvider } from "./WorkspaceLogProvider";
import { WorkspaceShellTabFrame } from "./WorkspaceShellTabFrame";
import { WorkspaceVisitedTabPanel } from "./WorkspaceVisitedTabPanel";

function WorkspaceSidebarDisplayPrefs({
  screen,
  screenFilters,
}: {
  screen: WorkspaceNavScreen;
  screenFilters: FilterDef[];
}) {
  const filterConfig =
    screen === "cookie"
      ? { filters: COOKIE_ROUTE_FILTER_DEFS, defaultFilterKeys: DEFAULT_COOKIE_ROUTE_FILTER_KEYS, filterParam: "cfilt" as const }
      : screen === "notes"
        ? { filters: [...NOTES_FILTER_DEFS], defaultFilterKeys: DEFAULT_NOTES_FILTER_KEYS, filterParam: "nfilt" as const }
        : screenFilters.length
          ? {
              filters: screenFilters.map(({ key, label }) => ({ key, label })),
              defaultFilterKeys: new Set(screenFilters.map((filter) => filter.key)),
              filterParam: screen === "twofa" ? ("afilt" as const) : ("hfilt" as const),
            }
          : { filters: [], defaultFilterKeys: new Set<string>(), filterParam: "hfilt" as const };

  return (
    <DisplayPrefs
      filters={filterConfig.filters}
      defaultFilterKeys={filterConfig.defaultFilterKeys}
      filterParam={filterConfig.filterParam}
      filtersFromUrl
      headerStats={[]}
      defaultHeaderStatKeys={new Set()}
      showRange={false}
      showLimit={false}
      showHeaderPin
      sidebarRow
      scope="tab"
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

  const mainClass = isNotesLayout ? "hub-main hub-main--notes" : "hub-main hub-main--tab";

  return (
    <WorkspaceLogProvider>
    <div className="hub-app theme-hub flex h-full min-h-0 w-full overflow-hidden">
      <WorkspaceSidebar
        screen={activeNav}
        onNavigate={onNav}
        displayPrefs={<WorkspaceSidebarDisplayPrefs screen={activeNav} screenFilters={[]} />}
      />

      <main className={`${mainClass} flex min-h-0 min-w-0 flex-col`}>
        <HubLoaderRoot />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <WorkspaceVisitedTabPanel tabId="notes" active={isNotesLayout} visited={visited}>
            <NotesWorkspaceScreen navigate={(opts) => navigate("notes", opts)} />
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
    </WorkspaceLogProvider>
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
