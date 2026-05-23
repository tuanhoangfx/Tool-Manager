export const APP_SCREENS = [
  "dashboard",
  "library",
  "activity",
  "system",
  "notes",
  "edit",
  "todo",
  "twofa",
  "cookie",
  "share",
  "settings",
] as const;

export type AppScreen = (typeof APP_SCREENS)[number];

export function isAppScreen(value: string | null): value is AppScreen {
  return value !== null && (APP_SCREENS as readonly string[]).includes(value);
}

export const SCREEN_LABELS: Record<AppScreen, string> = {
  dashboard: "Dashboard",
  library: "Tool Library",
  activity: "Activity",
  system: "System",
  notes: "Notes",
  edit: "Chỉnh sửa note",
  todo: "Todo (P0019)",
  twofa: "2FA",
  cookie: "Cookie Auto",
  share: "Share",
  settings: "Cài đặt",
};
