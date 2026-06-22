import { Users } from "lucide-react";
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
      if (filterKey === "assignee" || filterKey === "creator" || filterKey === "employee") {
        return { icon: Users, className: "text-sky-300" };
      }
      return semanticFilterAllIcon(filterKey);
    },
    resolveOption(filterKey, value) {
      // Project rows use per-option color dots from FilterOption.color (hub-ui golden).
      if (filterKey === "project") return null;
      if (filterKey === "assignee" || filterKey === "creator" || filterKey === "employee") {
        const user = profileUsersById.get(value);
        if (user) {
          const roleMeta = resolveWorkspaceRoleIcon(user.role);
          return { icon: roleMeta.icon, className: roleMeta.className };
        }
        return null;
      }
      // priority / dueDate use FilterOption.emoji + triggerEmoji (todo-hub-filter-helpers SSOT).
      return null;
    },
  });
}
