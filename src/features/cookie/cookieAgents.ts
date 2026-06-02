import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cookieAgentsCache } from "../../lib/cookie-boot-cache";
import { fetchCookieAgentsAndCommands, sendCookieAgentCommand } from "./cookieAgentsRepository";

export type CookieAgent = {
  id: string;
  user_id: string;
  browser_id: string;
  label: string | null;
  extension_version: string | null;
  route_count: number;
  selected_note_id: string | null;
  session_ready: boolean;
  facebook_cookie_count: number;
  facebook_has_login: boolean;
  last_route_pull_at: string | null;
  last_sync_at: string | null;
  last_vault_apply_at: string | null;
  last_command_at: string | null;
  last_error: string | null;
  status: Record<string, unknown> | null;
  last_seen_at: string;
};

export type CookieAgentCommand = {
  id: string;
  target_browser_id: string | null;
  command: string;
  note_id: string | null;
  domain: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

type SendCommandInput = {
  targetBrowserId?: string;
  command: string;
  noteId?: string;
  domain?: string;
  payload?: Record<string, unknown>;
};

export function useCookieAgents(session: Session | null) {
  const cached = cookieAgentsCache.readStale();
  const [agents, setAgents] = useState<CookieAgent[]>(() => cached?.agents ?? []);
  const [commands, setCommands] = useState<CookieAgentCommand[]>(() => cached?.commands ?? []);
  const [loading, setLoading] = useState(() => !cached && Boolean(session?.user?.id));
  const [error, setError] = useState<string | null>(null);
  const userId = session?.user?.id;

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!userId) return;
    const silent = opts?.silent ?? agents.length > 0;
    if (!silent) setLoading(true);
    const res = await fetchCookieAgentsAndCommands();
    if (!silent) setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setAgents(res.agents);
    setCommands(res.commands);
    cookieAgentsCache.write({ agents: res.agents, commands: res.commands });
  }, [userId, agents.length]);

  const sendCommand = useCallback(
    async (input: SendCommandInput) => {
      if (!userId) return { ok: false as const, error: "Not signed in." };
      const res = await sendCookieAgentCommand({
        userId,
        targetBrowserId: input.targetBrowserId,
        command: input.command,
        noteId: input.noteId,
        domain: input.domain ?? ".facebook.com",
        payload: input.payload ?? {},
      });
      if (!res.ok) return res;
      void refresh();
      return { ok: true as const };
    },
    [refresh, userId],
  );

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const nextDelay = () => (document.visibilityState === "hidden" ? 30000 : 12000);
    const tick = () => {
      if (cancelled) return;
      void refresh({ silent: true }).finally(() => {
        if (!cancelled) timer = window.setTimeout(tick, nextDelay());
      });
    };
    const onVisibility = () => {
      window.clearTimeout(timer);
      tick();
    };

    const stale = cookieAgentsCache.readStale();
    void refresh({ silent: stale != null && stale.agents.length > 0 });
    timer = window.setTimeout(tick, nextDelay());
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return { agents, commands, loading, error, refresh, sendCommand };
}
