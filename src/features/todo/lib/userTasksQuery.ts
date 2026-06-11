import { supabase } from "./supabase";

export const USER_TASKS_SELECT =
  "*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))";

export function userTasksCacheKey(userId: string): string {
  return `user_tasks_${userId}`;
}

export function fetchUserTasks(userId: string) {
  const jsonFilter = `assignees.cs.[{"user_id": "${userId}"}]`;
  return supabase
    .from("tasks")
    .select(USER_TASKS_SELECT)
    .or(`user_id.eq.${userId},created_by.eq.${userId},${jsonFilter}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });
}
