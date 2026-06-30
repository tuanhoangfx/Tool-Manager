import type { NavStructureEntry } from "@tool-workspace/hub-ui";
import { ClipboardList, Cookie, FileText, Gauge, KeyRound, Mail, Settings2, Shield, Table2 } from "lucide-react";
import type { TwofaVaultView } from "./twofa-vault-path";
import type { WorkspaceNavScreen } from "./workspace-screen";

export const NAV_SUBNAV_PREFIX = "p0020";

export const NAV_GROUP_IDS = ["account-vault"] as const;

/** Flat workspace nav — Account Vault group: Services + Mail + Quota. */
export const NAV_STRUCTURE: NavStructureEntry<WorkspaceNavScreen, (typeof NAV_GROUP_IDS)[number], TwofaVaultView>[] =
  [
    { kind: "screen", screen: "notes", label: "Notes", icon: FileText, iconTone: "indigo" },
    { kind: "screen", screen: "sheet", label: "Sheet", icon: Table2, iconTone: "cyan" },
    { kind: "screen", screen: "todo", label: "Todo", icon: ClipboardList, iconTone: "amber" },
    {
      kind: "group",
      navMode: "view",
      id: "account-vault",
      label: "Account",
      icon: Shield,
      iconTone: "amber",
      screen: "twofa",
      defaultView: "services",
      children: [
        { view: "services", label: "Services", icon: KeyRound, iconTone: "amber" },
        { view: "mail", label: "Mail", icon: Mail, iconTone: "sky" },
        { view: "quota", label: "Quota", icon: Gauge, iconTone: "violet" },
      ],
    },
    { kind: "screen", screen: "cookie", label: "Cookie Bridge", icon: Cookie, iconTone: "rose" },
    { kind: "screen", screen: "system", label: "System", icon: Settings2, iconTone: "cyan" },
  ];

export type WorkspaceNavItem = (typeof NAV_STRUCTURE)[number];
