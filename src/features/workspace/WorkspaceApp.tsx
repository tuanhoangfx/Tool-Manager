import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { DisplayPrefs } from "../../components/sales-shell";
import { WorkspaceSidebar } from "../../components/sales-shell/WorkspaceSidebar";
import { ToastContainer, ToastProvider } from "../../components/toast";
import type { WorkspaceNavScreen, WorkspaceScreen } from "../../lib/workspace-screen";
import { NAV_SCREENS } from "../../lib/workspace-screen";
import { readNoteIdFromUrl } from "../design-preview/design-nav";
import { readShareTokenFromUrl } from "../notes/shareUtils";
import { PublicShareScreen } from "../notes/PublicShareScreen";
import { DEFAULT_NOTES_FILTER_KEYS } from "../notes/notes-list-prefs";
import { NOTES_FILTER_DEFS } from "../notes/notes-filters";
import { useHubNavigation } from "../hub/useHubNavigation";
import { WorkspaceScreenChrome } from "./WorkspaceScreenChrome";
import { WorkspaceSearchProvider } from "./WorkspaceSearchContext";

const NotesWorkspaceScreen = lazy(() =>
  import("../notes/NotesWorkspaceScreen").then((m) => ({ default: m.NotesWorkspaceScreen })),
);
const TodoEmbed = lazy(() => import("../todo/TodoEmbed").then((m) => ({ default: m.TodoEmbed })));
const TwofaManagerScreen = lazy(() =>
  import("../twofa/TwofaManagerScreen").then((m) => ({ default: m.TwofaManagerScreen })),
);
const CookieSyncScreen = lazy(() =>
  import("../design-preview/screens/CookieSyncScreen").then((m) => ({ default: m.CookieSyncScreen })),
);

function WorkspaceSidebarDisplayPrefs() {
  return (
    <DisplayPrefs
      filters={[...NOTES_FILTER_DEFS]}
      defaultFilterKeys={DEFAULT_NOTES_FILTER_KEYS}
      headerStats={[]}
      defaultHeaderStatKeys={new Set()}
      showRange={false}
      showLimit={false}
      showHeaderPin
      sidebarRow
    />
  );
}

function navScreen(screen: WorkspaceScreen): WorkspaceNavScreen {
  if (screen === "edit") return "notes";
  if (NAV_SCREENS.includes(screen as WorkspaceNavScreen)) return screen as WorkspaceNavScreen;
  return "notes";
}

function ScreenFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--muted)]">
      Loading {label}…
    </div>
  );
}

function WorkspaceScreenBody({
  screen,
  navigate,
  query,
}: {
  screen: WorkspaceScreen;
  navigate: ReturnType<typeof useHubNavigation>["navigate"];
  query: string;
}) {
  switch (screen) {
    case "notes":
    case "edit":
      return (
        <Suspense fallback={<ScreenFallback label="Notes" />}>
          <NotesWorkspaceScreen
            navigate={(opts) => navigate("notes", opts)}
          />
        </Suspense>
      );
    case "todo":
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<ScreenFallback label="Todo" />}>
            <TodoEmbed />
          </Suspense>
        </div>
      );
    case "twofa":
      return (
        <Suspense fallback={<ScreenFallback label="2FA" />}>
          <TwofaManagerScreen shellMode query={query} />
        </Suspense>
      );
    case "cookie":
      return (
        <Suspense fallback={<ScreenFallback label="Cookie Auto" />}>
          <CookieSyncScreen shellMode query={query} />
        </Suspense>
      );
    default:
      return null;
  }
}

const NOTES_SCREENS = new Set<WorkspaceScreen>(["notes", "edit"]);

export function WorkspaceApp() {
  const { screen, navigate } = useHubNavigation();
  const shareToken = readShareTokenFromUrl();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (screen !== "edit") return;
    const note = readNoteIdFromUrl();
    navigate("notes", { note: note ?? undefined, replace: true });
  }, [screen, navigate]);

  useEffect(() => {
    if (!NOTES_SCREENS.has(screen)) setQuery("");
  }, [screen]);

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

  if (screen === "share" && shareToken) {
    return <PublicShareScreen />;
  }

  const activeNav = navScreen(screen);
  const isNotesLayout = NOTES_SCREENS.has(screen);

  const onNav = useCallback(
    (next: WorkspaceNavScreen) => {
      navigate(next);
    },
    [navigate],
  );

  const mainClass = isNotesLayout ? "hub-main hub-main--notes" : "hub-main";

  const body = (
    <WorkspaceScreenBody screen={screen} navigate={navigate} query={query} />
  );

  return (
    <ToastProvider>
      <div className="hub-app theme-hub flex h-full min-h-0 w-full overflow-hidden">
        <WorkspaceSidebar
          screen={activeNav}
          onNavigate={onNav}
          displayPrefs={<WorkspaceSidebarDisplayPrefs />}
        />

        <main className={`${mainClass} flex-1 min-h-0 min-w-0`}>
          {isNotesLayout ? (
            body
          ) : (
            <WorkspaceSearchProvider query={query} setQuery={setQuery}>
              <WorkspaceScreenChrome
                screen={screen}
                query={query}
                onQueryChange={setQuery}
              >
                {body}
              </WorkspaceScreenChrome>
            </WorkspaceSearchProvider>
          )}
        </main>
        <ToastContainer />
      </div>
    </ToastProvider>
  );
}
