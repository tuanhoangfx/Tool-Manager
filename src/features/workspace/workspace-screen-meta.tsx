import type { ElementType } from "react";
import { Cookie, FileText, KeyRound, Settings2 } from "lucide-react";
import type { WorkspaceScreen } from "../../lib/workspace-screen";
import type { TabHeaderMetaItem } from "../../components/sales-shell";

export type ScreenChromeConfig = {
  title: string;
  titleIcon: ElementType<{ size?: number; className?: string }>;
  titleIconClass?: string;
  ariaLabel: string;
  searchPlaceholder: string;
  showSearch: boolean;
  filterParam: "hfilt" | "nfilt" | "cfilt" | "afilt";
  /** Extra left meta after version · release (tab-specific). */
  extraMetaItems?: TabHeaderMetaItem[];
};

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
      };
    case "twofa":
      return {
        title: "2FA",
        titleIcon: KeyRound,
        titleIconClass: "text-amber-400",
        ariaLabel: "2FA header",
        searchPlaceholder: "Search service or account…",
        showSearch: true,
        filterParam: "afilt",
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
      };
    default:
      return {
        title: "Workspace",
        titleIcon: FileText,
        ariaLabel: "Workspace header",
        searchPlaceholder: "Search…",
        showSearch: false,
        filterParam: "hfilt",
      };
  }
}
