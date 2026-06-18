import { CircleHelp, MessageSquare } from "lucide-react";
import { mergeFilterIconResolver, semanticFilterAllIcon } from "@tool-workspace/hub-ui";

let configured = false;

/** Sheet panel filters — Question/Answer icons (hub-ui golden via mergeFilterIconResolver). */
export function setupSheetFilterIcons() {
  if (configured) return;
  configured = true;

  mergeFilterIconResolver({
    resolveAll(filterKey) {
      if (filterKey === "question") return { icon: CircleHelp, className: "text-rose-400" };
      if (filterKey === "answer") return { icon: MessageSquare, className: "text-cyan-300" };
      return semanticFilterAllIcon(filterKey);
    },
  });
}
