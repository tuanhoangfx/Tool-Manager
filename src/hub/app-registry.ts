import type { AppScreen } from "../features/design-preview/types";
import { SCREEN_LABELS } from "../features/design-preview/types";

/** Hub app registry — metadata for screens (lazy chunks wired in HubApp). */
export type HubAppEntry = {
  screen: AppScreen;
  label: string;
  group: "Home" | "P0004" | "Apps" | "System";
  chunk: string;
};

export const HUB_APP_REGISTRY: HubAppEntry[] = [
  { screen: "dashboard", label: SCREEN_LABELS.dashboard, group: "Home", chunk: "hub-dashboard" },
  { screen: "library", label: SCREEN_LABELS.library, group: "P0004", chunk: "hub-p0004-library" },
  { screen: "activity", label: SCREEN_LABELS.activity, group: "P0004", chunk: "hub-p0004-activity" },
  { screen: "system", label: SCREEN_LABELS.system, group: "P0004", chunk: "hub-p0004-system" },
  { screen: "notes", label: SCREEN_LABELS.notes, group: "Apps", chunk: "app-notes" },
  { screen: "edit", label: SCREEN_LABELS.edit, group: "Apps", chunk: "app-notes-edit" },
  { screen: "todo", label: SCREEN_LABELS.todo, group: "Apps", chunk: "app-todo" },
  { screen: "twofa", label: SCREEN_LABELS.twofa, group: "Apps", chunk: "app-twofa" },
  { screen: "cookie", label: SCREEN_LABELS.cookie, group: "Apps", chunk: "app-cookie" },
  { screen: "share", label: SCREEN_LABELS.share, group: "Apps", chunk: "app-share" },
  { screen: "settings", label: SCREEN_LABELS.settings, group: "System", chunk: "app-settings" },
];

export function hubAppByScreen(screen: AppScreen): HubAppEntry | undefined {
  return HUB_APP_REGISTRY.find((a) => a.screen === screen);
}
