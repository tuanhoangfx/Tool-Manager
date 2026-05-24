import { lazy, Suspense } from "react";
import { AppErrorBoundary } from "../components/AppErrorBoundary";
import { ToastContainer, ToastProvider } from "../components/toast";
import { P0008Sidebar } from "../theme/p0008/P0008Sidebar";
import type { AppScreen } from "../features/design-preview/types";
import { PublicShareScreen } from "../features/notes/PublicShareScreen";
import { readShareTokenFromUrl } from "../features/notes/shareUtils";
import { useAppNavigation } from "./useAppNavigation";

const NotesV1Screen = lazy(() => import("../features/notes/NotesV1Screen").then((m) => ({ default: m.NotesV1Screen })));
const TodoEmbed = lazy(() => import("../features/todo/TodoEmbed").then((m) => ({ default: m.TodoEmbed })));
const TwofaManagerScreen = lazy(() =>
  import("../features/twofa/TwofaManagerScreen").then((m) => ({ default: m.TwofaManagerScreen })),
);
const CookieSyncScreen = lazy(() =>
  import("../features/cookie/CookieSyncScreen").then((m) => ({ default: m.CookieSyncScreen })),
);
const SystemHubScreen = lazy(() =>
  import("../features/system-hub/SystemHubScreen").then((m) => ({ default: m.SystemHubScreen })),
);

function ScreenFallback({ label }: { label: string }) {
  return <div className="p-6 text-sm text-[var(--muted)]">Loading {label}…</div>;
}

function AppScreenBody({
  screen,
  navigate,
}: {
  screen: AppScreen;
  navigate: (s: AppScreen, opts?: { note?: string; token?: string }) => void;
}) {
  switch (screen) {
    case "notes":
    case "edit":
      return (
        <Suspense fallback={<ScreenFallback label="Notes" />}>
          <NotesV1Screen onNavigateNote={(noteId) => navigate("notes", { note: noteId })} />
        </Suspense>
      );
    case "todo":
      return (
        <div className="anim-fade flex h-full min-h-0 flex-col">
          <Suspense fallback={<ScreenFallback label="Todo" />}>
            <TodoEmbed />
          </Suspense>
        </div>
      );
    case "twofa":
      return (
        <Suspense fallback={<ScreenFallback label="2FA" />}>
          <TwofaManagerScreen />
        </Suspense>
      );
    case "cookie":
      return (
        <Suspense fallback={<ScreenFallback label="Cookie sync" />}>
          <CookieSyncScreen />
        </Suspense>
      );
    case "system":
      return (
        <Suspense fallback={<ScreenFallback label="System" />}>
          <SystemHubScreen />
        </Suspense>
      );
    case "share":
      return <PublicShareScreen />;
    default:
      return (
        <Suspense fallback={<ScreenFallback label="Notes" />}>
          <NotesV1Screen onNavigateNote={(noteId) => navigate("notes", { note: noteId })} />
        </Suspense>
      );
  }
}

export function ManagerApp() {
  const { screen, navigate } = useAppNavigation();
  const shareToken = readShareTokenFromUrl();

  if (screen === "share" && shareToken) {
    return <PublicShareScreen />;
  }

  return (
    <ToastProvider>
      <P0008Sidebar active={screen} onNavigate={navigate}>
        <AppErrorBoundary label={screen}>
          <AppScreenBody screen={screen} navigate={navigate} />
        </AppErrorBoundary>
      </P0008Sidebar>
      <ToastContainer />
    </ToastProvider>
  );
}
