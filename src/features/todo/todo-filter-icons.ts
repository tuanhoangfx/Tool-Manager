import { Calendar, Star, Users } from "lucide-react";
import { mergeFilterIconResolver, resolveWorkspaceRoleIcon, semanticFilterAllIcon } from "@tool-workspace/hub-ui";
import type { Profile } from "./types";

let configured = false;
let profileUsersById = new Map<string, Profile>();

/** Sync assignee/creator filter icons — call when workspace user directory loads. */
export function syncTodoFilterProfileUsers(users: Profile[]) {
  profileUsersById = new Map(users.map((u) => [u.id, u]));
}

/** Todo Kanban filters — merge into workspace badge-registry (do not replace). */
export function setupTodoFilterIcons() {
  if (configured) return;
  configured = true;

  mergeFilterIconResolver({
    resolveAll(filterKey) {
      if (filterKey === "assignee" || filterKey === "creator") {
        return { icon: Users, className: "text-sky-300" };
      }
      return semanticFilterAllIcon(filterKey);
    },
    resolveOption(filterKey, value) {
      // Project rows use per-option color dots from FilterOption.color (hub-ui golden).
      if (filterKey === "project") return null;
      if (filterKey === "assignee" || filterKey === "creator") {
        const user = profileUsersById.get(value);
        if (user) {
          const roleMeta = resolveWorkspaceRoleIcon(user.role);
          return { icon: roleMeta.icon, className: roleMeta.className };
        }
        return null;
      }
      if (filterKey === "priority") {
        if (value === "high") return { icon: Star, className: "text-rose-400" };
        if (value === "medium") return { icon: Star, className: "text-amber-400" };
        if (value === "low") return { icon: Star, className: "text-emerald-400" };
      }
      if (filterKey === "dueDate") return { icon: Calendar, className: "text-sky-300" };
      return null;
    },
  });
}
