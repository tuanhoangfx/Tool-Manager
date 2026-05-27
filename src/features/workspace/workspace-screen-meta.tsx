import type { ElementType } from "react";
import { Cookie, FileText, KeyRound, ListTodo, Package, Settings2, Users } from "lucide-react";
import { APP_VERSION } from "../../lib/app-meta";
import { EXTENSION_BUILD } from "../cookie/extensionBuildInfo";
import { EXTENSION_INSTALL_LABEL } from "../cookie/extensionInstall";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import type { TabHeaderMetaItem } from "../../components/sales-shell";

export type ScreenChromeConfig = {
  title: string;
  titleIcon: ElementType<{ size?: number; className?: string }>;
  titleIconClass?: string;
  ariaLabel: string;
  searchPlaceholder: string;
  showSearch: boolean;
  filterParam: "hfilt" | "nfilt" | "cfilt" | "tfilt" | "afilt" | "ufilt";
  metaItems: TabHeaderMetaItem[];
};

const BASE_META: TabHeaderMetaItem[] = [
  { icon: FileText, title: "Build", value: `v${APP_VERSION}` },
];

export function screenChromeConfig(screen: WorkspaceScreen): ScreenChromeConfig {
  switch (screen) {
    case "notes":
    case "edit":
      return {
        title: screen === "edit" ? "Edit note" : "Notes",
        titleIcon: FileText,
        titleIconClass: "text-indigo-400",
        ariaLabel: screen === "edit" ? "Edit note header" : "Notes header",
        searchPlaceholder: "Search notes, domain, slug…",
        showSearch: screen === "notes",
        filterParam: "nfilt",
        metaItems: BASE_META,
      };
    case "todo":
      return {
        title: "Todo",
        titleIcon: ListTodo,
        titleIconClass: "text-sky-400",
        ariaLabel: "Todo header",
        searchPlaceholder: "Search tasks…",
        showSearch: true,
        filterParam: "tfilt",
        metaItems: BASE_META,
      };
    case "twofa":
      return {
        title: "2FA",
        titleIcon: KeyRound,
        titleIconClass: "text-amber-400",
        ariaLabel: "2FA header",
        searchPlaceholder: "Search service or account…",
        showSearch: true,
        filterParam: "ufilt",
        metaItems: BASE_META,
      };
    case "cookie":
      return {
        title: "Cookie Auto",
        titleIcon: Cookie,
        titleIconClass: "text-violet-400",
        ariaLabel: "Cookie Auto header",
        searchPlaceholder: "Search domain, note, sync ID…",
        showSearch: true,
        filterParam: "cfilt",
        metaItems: [
          ...BASE_META,
          {
            icon: Cookie,
            title: "Extension",
            value: `v${EXTENSION_BUILD.version}`,
            live: true,
          },
          {
            icon: Package,
            title: "Install",
            value: EXTENSION_INSTALL_LABEL,
          },
        ],
      };
    case "users":
      return {
        title: "User Management",
        titleIcon: Users,
        titleIconClass: "text-emerald-400",
        ariaLabel: "User Management header",
        searchPlaceholder: "Search users by name, email, role, project…",
        showSearch: true,
        filterParam: "afilt",
        metaItems: BASE_META,
      };
    case "system":
      return {
        title: "System",
        titleIcon: Settings2,
        titleIconClass: "text-purple-400",
        ariaLabel: "System header",
        searchPlaceholder: "Search design templates…",
        showSearch: false,
        filterParam: "hfilt",
        metaItems: BASE_META,
      };
    default:
      return {
        title: "Workspace",
        titleIcon: FileText,
        ariaLabel: "Workspace header",
        searchPlaceholder: "Search…",
        showSearch: false,
        filterParam: "hfilt",
        metaItems: BASE_META,
      };
  }
}
