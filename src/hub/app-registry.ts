import { SCREEN_LABELS, type WorkspaceNavScreen } from "../lib/workspace-screen";

export type HubAppEntry = {
  screen: WorkspaceNavScreen;
  label: string;
  group: string;
  chunk: string;
};

/** Sidebar + lazy chunks — Notes, Todo, 2FA, Cookie Auto only */
export const HUB_APP_REGISTRY: HubAppEntry[] = [
  { screen: "notes", label: SCREEN_LABELS.notes, group: "Workspace", chunk: "app-notes" },
  { screen: "todo", label: SCREEN_LABELS.todo, group: "Workspace", chunk: "app-todo" },
  { screen: "twofa", label: SCREEN_LABELS.twofa, group: "Workspace", chunk: "app-twofa" },
  { screen: "cookie", label: SCREEN_LABELS.cookie, group: "Workspace", chunk: "app-cookie" },
];
