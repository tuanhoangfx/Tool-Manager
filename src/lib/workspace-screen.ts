/** P0020 workspace tabs — URL ?screen= */
export const WORKSPACE_SCREENS = ["notes", "edit", "todo", "twofa", "cookie", "users", "system", "share"] as const;

export type WorkspaceScreen = (typeof WORKSPACE_SCREENS)[number];

export type WorkspaceNavScreen = Exclude<WorkspaceScreen, "edit" | "share">;

export const NAV_SCREENS: WorkspaceNavScreen[] = ["notes", "todo", "twofa", "cookie", "users", "system"];

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
  todo: "Todo",
  twofa: "2FA",
  cookie: "Cookie Auto",
  users: "User Management",
  system: "System",
  share: "Share",
};
