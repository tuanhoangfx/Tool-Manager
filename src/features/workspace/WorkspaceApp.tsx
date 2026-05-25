import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { NotesNewNoteButton } from "../notes/NotesNewNoteButton";
import { WorkspaceSidebar } from "../../components/sales-shell/WorkspaceSidebar";
import { ToastProvider } from "../../components/toast";
import type { WorkspaceNavScreen, WorkspaceScreen } from "../../lib/workspace-screen";
import { isWorkspaceScreen, NAV_SCREENS } from "../../lib/workspace-screen";
import { readShareTokenFromUrl } from "../notes/shareUtils";
import { PublicShareScreen } from "../notes/PublicShareScreen";
import { useHubNavigation } from "../hub/useHubNavigation";
import { WorkspaceScreenChrome } from "./WorkspaceScreenChrome";
import { WorkspaceSearchProvider } from "./WorkspaceSearchContext";

const NotesGalleryScreen = lazy(() =>
  import("../notes/NotesGalleryScreen").then((m) => ({ default: m.NotesGalleryScreen })),
);
const NoteEditScreen = lazy(() =>
  import("../notes/NoteEditScreen").then((m) => ({ default: m.NoteEditScreen })),
);
const TodoEmbed = lazy(() => import("../todo/TodoEmbed").then((m) => ({ default: m.TodoEmbed })));
const TwofaManagerScreen = lazy(() =>
  import("../twofa/TwofaManagerScreen").then((m) => ({ default: m.TwofaManagerScreen })),
);
const CookieSyncScreen = lazy(() =>
  import("../design-preview/screens/CookieSyncScreen").then((m) => ({ default: m.CookieSyncScreen })),
);

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
      return (
        <Suspense fallback={<ScreenFallback label="Notes" />}>
          <NotesGalleryScreen
            shellMode
            query={query}
            onOpenNote={(id) => navigate("edit", { note: id })}
          />
        </Suspense>
      );
    case "edit":
      return (
        <Suspense fallback={<ScreenFallback label="Note editor" />}>
          <NoteEditScreen shellMode onClose={() => navigate("notes")} />
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

export function WorkspaceApp() {
  const { screen, navigate } = useHubNavigation();
  const shareToken = readShareTokenFromUrl();
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery("");
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
  const onNav = useCallback(
    (next: WorkspaceNavScreen) => {
      navigate(next);
    },
    [navigate],
  );

  const toolbar = useMemo(() => {
    if (screen === "edit") {
      return (
        <button type="button" className="btn-ghost btn text-[12px]" onClick={() => navigate("notes")}>
          <ArrowLeft size={14} />
          Back to Notes
        </button>
      );
    }
    if (screen === "notes") {
      return (
        <NotesNewNoteButton onCreated={(id) => navigate("edit", { note: id })} />
      );
    }
    return null;
  }, [screen, navigate]);

  return (
    <ToastProvider>
      <div className="hub-app theme-hub flex h-full min-h-0 w-full overflow-hidden">
        <WorkspaceSidebar screen={activeNav} onNavigate={onNav} />

        <main className="hub-main flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
          <WorkspaceSearchProvider query={query} setQuery={setQuery}>
            <WorkspaceScreenChrome
              screen={screen}
              query={query}
              onQueryChange={setQuery}
              toolbar={toolbar}
            >
              <WorkspaceScreenBody screen={screen} navigate={navigate} query={query} />
            </WorkspaceScreenChrome>
          </WorkspaceSearchProvider>
        </main>
      </div>
    </ToastProvider>
  );
}
