import { CircleHelp, FolderOpen, Layers, MessageSquare, Rocket } from "lucide-react";
import { mergeFilterIconResolver, semanticFilterAllIcon } from "@tool-workspace/hub-ui";

let configured = false;

/** Sheet panel filters — Project/Platform/Category/Question/Answer icons. */
export function setupSheetFilterIcons() {
  if (configured) return;
  configured = true;

  mergeFilterIconResolver({
    resolveAll(filterKey) {
      if (filterKey === "project") return { icon: Rocket, className: "text-violet-300" };
      if (filterKey === "platform") return { icon: Layers, className: "text-cyan-300" };
      if (filterKey === "category") return { icon: FolderOpen, className: "text-amber-300" };
      if (filterKey === "question") return { icon: CircleHelp, className: "text-rose-400" };
      if (filterKey === "answer") return { icon: MessageSquare, className: "text-cyan-300" };
      return semanticFilterAllIcon(filterKey);
    },
  });
}
