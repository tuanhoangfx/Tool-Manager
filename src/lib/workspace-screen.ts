/** P0020-Data-Box tabs — path routes (/notes, /cookie, …); legacy ?screen= still read */
export const WORKSPACE_SCREENS = ["notes", "edit", "sheet", "todo", "twofa", "cookie", "system", "share"] as const;

export type WorkspaceScreen = (typeof WORKSPACE_SCREENS)[number];

export type WorkspaceNavScreen = Exclude<WorkspaceScreen, "edit" | "share">;

/** In-app tabs only — workspace users live on Tool Hub (P0004). */
export const NAV_SCREENS: WorkspaceNavScreen[] = ["notes", "sheet", "todo", "twofa", "cookie", "system"];

export function isWorkspaceScreen(value: string | null): value is WorkspaceScreen {
  return value !== null && (WORKSPACE_SCREENS as readonly string[]).includes(value);
}

export function isNavScreen(value: string | null): value is WorkspaceNavScreen {
  return value !== null && (NAV_SCREENS as readonly string[]).includes(value);
}

/** @deprecated Use WorkspaceScreen — kept for gradual migration */
export type AppScreen = WorkspaceScreen;

export const APP_SCREENS = WORKSPACE_SCREENS;

export function isAppScreen(value: string | null): value is AppScreen {
  return isWorkspaceScreen(value);
}

export const SCREEN_LABELS: Record<WorkspaceScreen, string> = {
  notes: "Notes",
  edit: "Edit note",
  sheet: "Sheet",
  todo: "Todo",
  twofa: "Account",
  cookie: "Cookie Bridge",
  system: "System",
  share: "Share",
};
