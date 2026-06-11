import type { Session } from "@supabase/supabase-js";
import { createTodoQueryCache } from "../features/todo/lib/createTodoQueryCache";
import { fetchUserTasks, userTasksCacheKey } from "../features/todo/lib/userTasksQuery";
import type { Task } from "../features/todo/types";
import { ensureDataBoxAuth } from "./ensure-data-box-auth";
import { getOfflineMode } from "./offlineMode";

let inFlight = false;

/** Warm Todo Kanban cache (hub-load createClientCache) before first tab open. */
export function prefetchTodoTasksBackground(session?: Session | null): void {
  if (inFlight || getOfflineMode()) return;
  inFlight = true;

  void (async () => {
    try {
      const resolved = session ?? (await ensureDataBoxAuth());
      const userId = resolved?.user?.id;
      if (!userId) return;

      const cache = createTodoQueryCache<Task[]>(userTasksCacheKey(userId));
      if (cache.readFresh()) return;

      const { data, error } = await fetchUserTasks(userId);
      if (!error && data) {
        cache.write(data);
      }
    } catch {
      /* auth not ready */
    } finally {
      inFlight = false;
    }
  })();
}
