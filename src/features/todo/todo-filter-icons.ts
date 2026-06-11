import { Calendar, Star } from "lucide-react";
import { mergeFilterIconResolver, semanticFilterAllIcon } from "@tool-workspace/hub-ui";

let configured = false;

/** Todo Kanban filters — merge into workspace badge-registry (do not replace). */
export function setupTodoFilterIcons() {
  if (configured) return;
  configured = true;

  mergeFilterIconResolver({
    resolveAll(filterKey) {
      return semanticFilterAllIcon(filterKey);
    },
    resolveOption(filterKey, value) {
      if (filterKey === "priority") {
        if (value === "high") return { icon: Star, className: "text-rose-400" };
        if (value === "medium") return { icon: Star, className: "text-amber-400" };
        if (value === "low") return { icon: Star, className: "text-emerald-400" };
      }
      if (filterKey === "dueDate") return { icon: Calendar, className: "opacity-75" };
      return null;
    },
  });
}
