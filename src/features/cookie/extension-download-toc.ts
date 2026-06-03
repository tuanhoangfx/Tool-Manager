import type { OverviewTocItem } from "../overview/overview-toc";

export const EXTENSION_DOWNLOAD_TOC = [
  { id: "release", label: "Release", emoji: "🏷️", chipClass: "border-indigo-400/30 bg-indigo-500/15" },
  { id: "install", label: "Install", emoji: "📦", chipClass: "border-emerald-400/30 bg-emerald-500/15" },
] as const satisfies readonly OverviewTocItem[];

export function extensionDownloadSectionTitle(id: (typeof EXTENSION_DOWNLOAD_TOC)[number]["id"]): string {
  const item = EXTENSION_DOWNLOAD_TOC.find((t) => t.id === id);
  return item ? `${item.emoji} ${item.label}` : id;
}
