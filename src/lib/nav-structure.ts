import type { NavIconTone, NavScreenNavItem } from "@tool-workspace/hub-ui";
import { ClipboardList, Cookie, FileText, KeyRound, Settings2, Table2 } from "lucide-react";
import type { WorkspaceNavScreen } from "./workspace-screen";

export const NAV_SUBNAV_PREFIX = "p0020";

/** Flat workspace nav — extend with NavViewGroupConfig when sub-views are added. */
export const NAV_STRUCTURE: NavScreenNavItem<WorkspaceNavScreen>[] = [
  { kind: "screen", screen: "notes", label: "Notes", icon: FileText, iconTone: "indigo" },
  { kind: "screen", screen: "sheet", label: "Sheet", icon: Table2, iconTone: "cyan" },
  { kind: "screen", screen: "todo", label: "Todo", icon: ClipboardList, iconTone: "amber" },
  { kind: "screen", screen: "twofa", label: "2FA", icon: KeyRound, iconTone: "amber" },
  { kind: "screen", screen: "cookie", label: "Cookie Bridge", icon: Cookie, iconTone: "rose" },
  { kind: "screen", screen: "system", label: "System", icon: Settings2, iconTone: "cyan" },
];

export type WorkspaceNavItem = (typeof NAV_STRUCTURE)[number] & { iconTone: NavIconTone };
