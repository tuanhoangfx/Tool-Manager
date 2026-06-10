import type { Translation } from "../types";

type StatusMap = Record<string, string>;

export function formatActivityLogMessage(
  log: {
    action: string;
    details: {
      task_title?: string;
      from?: string;
      to?: string;
      count?: number;
    } | null;
    profiles?: { full_name?: string | null } | null;
  },
  t: Translation,
): string {
  const user = log.profiles?.full_name || t.a_user;
  const task = log.details?.task_title ? `"${log.details.task_title}"` : t.a_task;

  const statusMap: StatusMap = {
    todo: t.todo,
    inprogress: t.inprogress,
    done: t.done,
    cancelled: t.cancelled,
  };

  switch (log.action) {
    case "created_task":
      return t.log_created_task(user, task);
    case "updated_task":
      return t.log_updated_task(user, task);
    case "deleted_task":
      return t.log_deleted_task(user, task);
    case "status_changed": {
      const fromStatus = statusMap[log.details?.from ?? ""] || log.details?.from;
      const toStatus = statusMap[log.details?.to ?? ""] || log.details?.to;
      return t.log_status_changed(user, task, fromStatus ?? "", toStatus ?? "");
    }
    case "added_attachments":
      return t.log_added_attachments(user, log.details?.count || 0, task);
    case "removed_attachments":
      return t.log_removed_attachments(user, log.details?.count || 0, task);
    case "cleared_cancelled_tasks":
      return t.log_cleared_cancelled_tasks(user, log.details?.count || 0);
    default:
      return `${user} ${log.action} ${task}`;
  }
}
