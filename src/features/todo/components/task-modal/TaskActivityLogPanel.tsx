import { useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useSettings } from "../../context/SettingsContext";
import { SpinnerIcon } from "../Icons";
import type { ActivityLog } from "../../types";
import { formatAbsoluteDateTime } from "../../lib/taskUtils";
import { formatActivityLogMessage } from "../../lib/activity-log-format";
import Avatar from "../common/Avatar";
import { useCachedSupabaseQuery } from "../../hooks/useCachedSupabaseQuery";

type Props = {
  taskId: number;
};

/** Task-scoped activity timeline — embedded in Task Detail modal. */
export function TaskActivityLogPanel({ taskId }: Props) {
  const { t, language, timezone } = useSettings();

  const fetchLogsQuery = useCallback(async () => {
    return supabase
      .from("activity_logs")
      .select("*, profiles(id, full_name, avatar_url, role)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(100);
  }, [taskId]);

  const { data: logs, loading } = useCachedSupabaseQuery<ActivityLog[]>({
    cacheKey: `task_activity_logs_${taskId}`,
    query: fetchLogsQuery,
    dependencies: [taskId],
    lastDataChange: null,
  });

  const safeLogs = logs || [];

  if (loading && safeLogs.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <SpinnerIcon size={28} className="animate-spin text-[var(--accent-color)]" />
      </div>
    );
  }

  if (safeLogs.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--muted)]">{t.noActivity}</p>;
  }

  return (
    <ul className="divide-y divide-white/5">
      {safeLogs.map((log: ActivityLog) => {
        const message = formatActivityLogMessage(log, t);
        return (
          <li key={log.id} className="flex items-start gap-3 p-3">
            <div className="mt-0.5 shrink-0">
              {log.profiles ? (
                <Avatar user={log.profiles} title={log.profiles.full_name || ""} size={28} />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-[var(--text)]">{message}</p>
              <time className="text-xs tabular-nums text-[var(--muted)]">
                {formatAbsoluteDateTime(log.created_at, language, timezone)}
              </time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
