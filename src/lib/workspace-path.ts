import type { WorkspaceNavScreen, WorkspaceScreen } from "./workspace-screen";

/** Path-first routes for P0020-Data-Box (e.g. /cookie). */
export const NAV_SCREEN_PATH: Record<WorkspaceNavScreen, string> = {
  notes: "/notes",
  todo: "/todo",
  twofa: "/twofa",
  cookie: "/cookie",
  users: "/users",
  system: "/system",
};

const PATH_TO_NAV_SCREEN = new Map<string, WorkspaceNavScreen>(
  Object.entries(NAV_SCREEN_PATH).map(([screen, path]) => [path, screen as WorkspaceNavScreen]),
);

PATH_TO_NAV_SCREEN.set("/", "notes");
PATH_TO_NAV_SCREEN.set("", "notes");

export function pathnameToNavScreen(pathname: string): WorkspaceNavScreen | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return PATH_TO_NAV_SCREEN.get(normalized) ?? null;
}

export function navScreenToPath(screen: WorkspaceNavScreen): string {
  return NAV_SCREEN_PATH[screen];
}

export function buildAppUrl(screen: WorkspaceScreen, search = ""): string {
  const base =
    screen === "share" || screen === "edit"
      ? `/?screen=${encodeURIComponent(screen)}`
      : navScreenToPath(screen as WorkspaceNavScreen);
  if (!search) return base;
  const q = search.startsWith("?") ? search.slice(1) : search;
  return `${base}?${q}`;
}
