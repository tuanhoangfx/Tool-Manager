import { lazy, Suspense, useEffect, useState } from "react";
import { P0008Sidebar } from "../../theme/p0008/P0008Sidebar";
import "../../theme/p0008-globals.css";
import "../../theme/p0008/hub-p0004-embed.css";
import type { AppScreen } from "../design-preview/types";
import { PublicShareScreen } from "../notes/PublicShareScreen";
import { readShareTokenFromUrl } from "../notes/shareUtils";
import { useRepositories } from "../../hooks/useRepositories";
import { appendSessionLog } from "../system/SystemTab";
import { useHubNavigation } from "./useHubNavigation";

const InteractiveDashboard = lazy(() =>
  import("./InteractiveDashboard").then((m) => ({ default: m.InteractiveDashboard })),
);
const P0004LibraryScreen = lazy(() =>
  import("./P0004LibraryScreen").then((m) => ({ default: m.P0004LibraryScreen })),
);
const P0004ActivityScreen = lazy(() =>
  import("./P0004ActivityScreen").then((m) => ({ default: m.P0004ActivityScreen })),
);
const P0004SystemScreen = lazy(() =>
  import("./P0004SystemScreen").then((m) => ({ default: m.P0004SystemScreen })),
);
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
const SettingsScreen = lazy(() =>
  import("../design-preview/screens/SettingsScreen").then((m) => ({ default: m.SettingsScreen })),
);

function ScreenFallback({ label }: { label: string }) {
  return <div className="p-6 text-sm text-[var(--muted)]">Đang tải {label}…</div>;
}

function HubScreenBody({
  screen,
  navigate,
  tools,
  loadingAll,
  lastRefreshedAt,
  onRefresh,
  onCopyPath,
}: {
  screen: AppScreen;
  navigate: (s: AppScreen, opts?: { note?: string }) => void;
  tools: ReturnType<typeof useRepositories>["resolvedTools"];
  loadingAll: boolean;
  lastRefreshedAt: number | null;
  onRefresh: () => void;
  onCopyPath: (path: string) => void;
}) {
  switch (screen) {
    case "dashboard":
      return (
        <Suspense fallback={<ScreenFallback label="Dashboard" />}>
          <InteractiveDashboard onNavigate={navigate} />
        </Suspense>
      );
    case "library":
      return (
        <Suspense fallback={<ScreenFallback label="Tool Library" />}>
          <P0004LibraryScreen tools={tools} loadingAll={loadingAll} onRefresh={onRefresh} />
        </Suspense>
      );
    case "activity":
      return (
        <Suspense fallback={<ScreenFallback label="Activity" />}>
          <P0004ActivityScreen tools={tools} />
        </Suspense>
      );
    case "system":
      return (
        <Suspense fallback={<ScreenFallback label="System" />}>
          <P0004SystemScreen
            tools={tools}
            loadingAll={loadingAll}
            lastRefreshedAt={lastRefreshedAt}
            onCopyPath={onCopyPath}
          />
        </Suspense>
      );
    case "notes":
      return (
        <Suspense fallback={<ScreenFallback label="Notes" />}>
          <NotesGalleryScreen onOpenNote={(id) => navigate("edit", { note: id })} />
        </Suspense>
      );
    case "edit":
      return (
        <Suspense fallback={<ScreenFallback label="Chỉnh sửa note" />}>
          <NoteEditScreen onClose={() => navigate("notes")} />
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
    case "share":
      return <PublicShareScreen />;
    case "settings":
      return (
        <Suspense fallback={<ScreenFallback label="Cài đặt" />}>
          <SettingsScreen />
        </Suspense>
      );
    default:
      return (
        <Suspense fallback={<ScreenFallback label="Dashboard" />}>
          <InteractiveDashboard onNavigate={navigate} />
        </Suspense>
      );
  }
}

export function HubApp() {
  const { screen, navigate } = useHubNavigation();
  const shareToken = readShareTokenFromUrl();

  if (screen === "share" && shareToken) {
    return <PublicShareScreen />;
  }

  const { resolvedTools, loadingAll, refreshAll } = useRepositories();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!loadingAll && resolvedTools.some((t) => t.remote?.checkedAt)) {
      setLastRefreshedAt(Date.now());
    }
  }, [loadingAll, resolvedTools]);

  const onCopyPath = async (path: string) => {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(path);
      appendSessionLog("Copied folder path", path);
    } catch {
      /* ignore */
    }
  };

  const onRefresh = () => {
    appendSessionLog("Manual refresh", `${resolvedTools.length} tools`);
    void refreshAll();
  };

  return (
    <P0008Sidebar active={screen} onNavigate={navigate}>
      <HubScreenBody
        screen={screen}
        navigate={navigate}
        tools={resolvedTools}
        loadingAll={loadingAll}
        lastRefreshedAt={lastRefreshedAt}
        onRefresh={onRefresh}
        onCopyPath={onCopyPath}
      />
    </P0008Sidebar>
  );
}
