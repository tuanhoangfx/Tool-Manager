import { Calendar, FolderOpen, Star, Users } from "lucide-react";
import { configureFilterIcons } from "@tool-workspace/hub-ui";

let configured = false;

/** Hub FilterBar glyph resolver for Todo Kanban filters (golden P0020/todo). */
export function setupTodoFilterIcons() {
  if (configured) return;
  configured = true;

  configureFilterIcons({
    resolveAll(filterKey) {
      if (filterKey === "project") return { icon: FolderOpen, className: "opacity-75" };
      if (filterKey === "dueDate") return { icon: Calendar, className: "opacity-75" };
      if (filterKey === "creator") return { icon: Users, className: "opacity-75" };
      if (filterKey === "priority") return { icon: Star, className: "text-amber-400/90" };
      return null;
    },
    resolveOption(filterKey, value) {
      if (filterKey === "priority") {
        if (value === "high") return { icon: Star, className: "text-rose-400" };
        if (value === "medium") return { icon: Star, className: "text-amber-400" };
        if (value === "low") return { icon: Star, className: "text-emerald-400" };
      }
      if (filterKey === "dueDate") return { icon: Calendar, className: "opacity-75" };
      if (filterKey === "creator") return { icon: Users, className: "opacity-75" };
      return null;
    },
  });
}
