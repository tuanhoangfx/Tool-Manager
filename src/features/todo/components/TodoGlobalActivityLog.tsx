import { useCallback, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { History } from "lucide-react";
import {
  TabButton,
  compactIconSize,
} from "@tool-workspace/hub-ui";

import { supabase } from "../lib/supabase";
import { useSettings } from "../context/SettingsContext";
import { SpinnerIcon } from "./Icons";
import type { ActivityLog, Task } from "../types";
import { formatAbsoluteDateTime } from "../lib/taskUtils";
import { formatActivityLogMessage } from "../lib/activity-log-format";
import Avatar from "./common/Avatar";
import CopyIdButton from "./common/CopyIdButton";
import { TodoHubSearchInput } from "./common/TodoHubSearchInput";
import { useCachedSupabaseQuery } from "../hooks/useCachedSupabaseQuery";

type Props = {
  session: Session | null;
  onLogClick: (log: ActivityLog) => void;
  /** When set, "This task" tab filters to this task id. */
  taskIdFilter?: number | null;
};

/** Global activity log embed for Hub Log modal — All / This task tabs. */
export function TodoGlobalActivityLog({ session, onLogClick, taskIdFilter = null }: Props) {
  const { t, language, timezone } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"all" | "task">(taskIdFilter ? "task" : "all");

  const fetchLogsQuery = useCallback(async () => {
    if (!session?.user) return { data: [], error: null };
    return supabase
      .from("activity_logs")
      .select("*, profiles(id, full_name, avatar_url, role)")
      .order("created_at", { ascending: false })
      .limit(200);
  }, [session?.user?.id]);

  const { data: logs, loading } = useCachedSupabaseQuery<ActivityLog[]>({
    cacheKey: "global_activity_logs_embed",
    query: fetchLogsQuery,
    dependencies: [session?.user?.id],
    lastDataChange: null,
  });

  const safeLogs = logs || [];

  const filteredLogs = useMemo(() => {
    return safeLogs.filter((log) => {
      if (tab === "task" && taskIdFilter && log.task_id !== taskIdFilter) return false;
      if (!searchTerm.trim()) return true;
      const message = formatActivityLogMessage(log, t).toLowerCase();
      return message.includes(searchTerm.toLowerCase());
    });
  }, [safeLogs, searchTerm, tab, taskIdFilter, t]);

  return (
    <div className="space-y-3">
      {taskIdFilter ? (
        <div className="flex gap-1">
          <TabButton
            active={tab === "all"}
            onClick={() => setTab("all")}
            icon={<History size={compactIconSize(12)} aria-hidden />}
          >
            All
          </TabButton>
          <TabButton
            active={tab === "task"}
            onClick={() => setTab("task")}
            icon={<History size={compactIconSize(12)} aria-hidden />}
          >
            This task
          </TabButton>
        </div>
      ) : null}
      <TodoHubSearchInput
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={t.log_searchPlaceholder}
        shortcutScope="todo-log-activity"
      />
      {loading && safeLogs.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <SpinnerIcon size={24} className="animate-spin text-[var(--accent-color)]" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <p className="py-6 text-center text-xs text-[var(--muted)]">{t.noActivity}</p>
      ) : (
        <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
          {filteredLogs.map((log) => {
            const message = formatActivityLogMessage(log, t);
            const clickable = Boolean(log.task_id);
            return (
              <li
                key={log.id}
                className={`flex items-start gap-3 p-2.5 transition-colors ${
                  clickable ? "cursor-pointer rounded-lg hover:bg-white/[.04]" : ""
                }`}
                onClick={() => clickable && onLogClick(log)}
              >
                <div className="mt-0.5 shrink-0">
                  {log.profiles ? (
                    <Avatar user={log.profiles} title={log.profiles.full_name || ""} size={28} />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug text-[var(--text)]">
                    {message}
                    {log.task_id ? <CopyIdButton id={log.task_id} isInline /> : null}
                  </p>
                  <time className="text-[10px] tabular-nums text-[var(--muted)]">
                    {formatAbsoluteDateTime(log.created_at, language, timezone)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export async function fetchTaskForActivityLog(taskId: number): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "*, assignee:user_id(*), creator:created_by(*), projects:project_id(*), task_attachments(*), task_time_logs(*), task_comments(*, profiles(*))",
    )
    .eq("id", taskId)
    .single();
  if (error || !data) return null;
  return data as Task;
}
