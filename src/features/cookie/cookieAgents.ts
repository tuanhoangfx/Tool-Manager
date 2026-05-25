import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

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

function schemaError(err: unknown) {
  const message = err && typeof err === "object" && "message" in err ? String(err.message) : String(err ?? "");
  if (/cookie_bridge_agents|cookie_bridge_commands|schema cache|does not exist|PGRST/i.test(message)) {
    return "Browser agents table is missing. Run supabase/migrations/20260525165000_cookie_bridge_agents.sql.";
  }
  return message || "Browser agents failed.";
}

export function useCookieAgents(session: Session | null) {
  const [agents, setAgents] = useState<CookieAgent[]>([]);
  const [commands, setCommands] = useState<CookieAgentCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const [agentRes, commandRes] = await Promise.all([
      supabase
        .from("cookie_bridge_agents")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(20),
      supabase
        .from("cookie_bridge_commands")
        .select("id,target_browser_id,command,note_id,domain,status,result,error,created_at,completed_at")
        .order("created_at", { ascending: false })
        .limit(12),
    ]);
    setLoading(false);
    if (agentRes.error || commandRes.error) {
      setError(schemaError(agentRes.error ?? commandRes.error));
      return;
    }
    setError(null);
    setAgents((agentRes.data ?? []) as CookieAgent[]);
    setCommands((commandRes.data ?? []) as CookieAgentCommand[]);
  }, [session?.user?.id]);

  const sendCommand = useCallback(
    async (input: SendCommandInput) => {
      if (!session?.user?.id) return { ok: false as const, error: "Not signed in." };
      const { error: insertError } = await supabase.from("cookie_bridge_commands").insert({
        user_id: session.user.id,
        target_browser_id: input.targetBrowserId ?? null,
        command: input.command,
        note_id: input.noteId ?? null,
        domain: input.domain ?? ".facebook.com",
        payload: input.payload ?? {},
      });
      if (insertError) return { ok: false as const, error: schemaError(insertError) };
      void refresh();
      return { ok: true as const };
    },
    [refresh, session?.user?.id],
  );

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { agents, commands, loading, error, refresh, sendCommand };
}
