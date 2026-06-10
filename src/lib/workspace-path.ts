import type { WorkspaceNavScreen, WorkspaceScreen } from "./workspace-screen";
import { PUBLIC_SHARE_PATH } from "../features/notes/shareUtils";

/** Path-first routes for P0020-Data-Box (e.g. /cookie). */
export const NAV_SCREEN_PATH: Record<WorkspaceNavScreen, string> = {
  notes: "/notes",
  todo: "/todo",
  twofa: "/twofa",
  cookie: "/cookie",
  system: "/system",
};

/** Legacy path — redirects to Tool Hub /users. */
export const USERS_LEGACY_PATH = "/users";

const PATH_TO_NAV_SCREEN = new Map<string, WorkspaceNavScreen>(
  Object.entries(NAV_SCREEN_PATH).map(([screen, path]) => [path, screen as WorkspaceNavScreen]),
);

PATH_TO_NAV_SCREEN.set("/", "notes");
PATH_TO_NAV_SCREEN.set("", "notes");

export function isUsersLegacyPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === USERS_LEGACY_PATH;
}

export function pathnameToNavScreen(pathname: string): WorkspaceNavScreen | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (isUsersLegacyPath(normalized)) return null;
  return PATH_TO_NAV_SCREEN.get(normalized) ?? null;
}

export function navScreenToPath(screen: WorkspaceNavScreen): string {
  return NAV_SCREEN_PATH[screen];
}

function parseSearch(search: string): URLSearchParams {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

/** Drop redundant `screen` when the pathname already identifies the tab. */
export function searchWithoutNavScreen(search = ""): string {
  const p = parseSearch(search);
  p.delete("screen");
  return p.toString();
}

export function buildAppUrl(screen: WorkspaceScreen, search = ""): string {
  if (screen === "share") {
    const p = parseSearch(search);
    const token = p.get("token")?.trim();
    if (token) return `${PUBLIC_SHARE_PATH}?token=${encodeURIComponent(token)}`;
    return PUBLIC_SHARE_PATH;
  }
  const base = screen === "edit" ? `/?screen=${encodeURIComponent(screen)}` : navScreenToPath(screen as WorkspaceNavScreen);
  if (!search) return base;
  const q = screen === "edit" ? parseSearch(search).toString() : searchWithoutNavScreen(search);
  return q ? `${base}?${q}` : base;
}
