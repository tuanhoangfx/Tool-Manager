import { supabase } from "../../lib/supabase";
import type { CookieAgent, CookieAgentCommand } from "./cookieAgents";

export type SendCookieAgentCommandInput = {
  userId: string;
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

export async function fetchCookieAgentsAndCommands() {
  const [agentRes, commandRes] = await Promise.all([
    supabase
      .from("cookie_bridge_agents")
      .select(
        "id,user_id,browser_id,label,extension_version,route_count,selected_note_id,session_ready,facebook_cookie_count,facebook_has_login,last_route_pull_at,last_sync_at,last_vault_apply_at,last_command_at,last_error,status,last_seen_at",
      )
      .order("last_seen_at", { ascending: false })
      .limit(20),
    supabase
      .from("cookie_bridge_commands")
      .select("id,target_browser_id,command,note_id,domain,status,result,error,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (agentRes.error || commandRes.error) {
    return { ok: false as const, error: schemaError(agentRes.error ?? commandRes.error) };
  }

  return {
    ok: true as const,
    agents: (agentRes.data ?? []) as CookieAgent[],
    commands: (commandRes.data ?? []) as CookieAgentCommand[],
  };
}

export async function sendCookieAgentCommand(input: SendCookieAgentCommandInput) {
  const { error } = await supabase.from("cookie_bridge_commands").insert({
    user_id: input.userId,
    target_browser_id: input.targetBrowserId ?? null,
    command: input.command,
    note_id: input.noteId ?? null,
    domain: input.domain ?? ".facebook.com",
    payload: input.payload ?? {},
  });
  if (error) return { ok: false as const, error: schemaError(error) };
  return { ok: true as const };
}
