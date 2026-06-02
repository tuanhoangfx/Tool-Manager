import { useCallback, useMemo, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useAppToast } from "../../components/toast";
import type { CookieBinding } from "./cookieBridge";
import { CookieBrowserAgents } from "./CookieBrowserAgents";
import { CookieRouteMembers } from "./CookieRouteMembers";
import { useCookieAgents, type CookieAgent } from "./cookieAgents";

export type CookieRouteDetailRenderers = {
  renderAccessDetail: (binding: CookieBinding) => ReactNode;
  renderAgentDetail: (binding: CookieBinding) => ReactNode;
};

type AgentCommandHandler = (
  targetBrowserId: string,
  command: string,
  payload?: Record<string, unknown>,
) => Promise<{ ok: true } | { ok: false; error: string }>;

/** Same Access / Agents sections as Cookie Auto route detail modal. */
export function useCookieRouteDetailRenderers(
  session: Session | null,
  opts?: {
    onShared?: () => void;
    onSetSource?: (agent: CookieAgent) => Promise<void>;
    /** When set (e.g. Notes modal), agent commands target this route. */
    onCommand?: AgentCommandHandler;
  },
): CookieRouteDetailRenderers {
  const { pushToast } = useAppToast();
  const {
    agents,
    commands: agentCommands,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
    sendCommand: sendAgentCommand,
  } = useCookieAgents(session);

  const onShared = opts?.onShared;

  const defaultOnCommand = useCallback<AgentCommandHandler>(
    async (targetBrowserId, command, payload = {}) => {
      const noteId =
        typeof payload.noteId === "string" && payload.noteId.trim()
          ? payload.noteId.trim()
          : command === "sync-now" || command === "apply-vault"
            ? undefined
            : undefined;
      const domain =
        typeof payload.domain === "string" && payload.domain.trim()
          ? payload.domain.trim()
          : ".facebook.com";
      const res = await sendAgentCommand({
        targetBrowserId,
        command,
        noteId,
        domain,
        payload,
      });
      if (res.ok) {
        pushToast(`Queued ${command} for browser ${targetBrowserId.slice(0, 8)}.`, "success");
        window.setTimeout(() => void refreshAgents(), 1400);
      } else {
        pushToast(res.error, "error", 8000);
      }
      return res;
    },
    [pushToast, refreshAgents, sendAgentCommand],
  );

  const onCommand = opts?.onCommand ?? defaultOnCommand;

  const renderAccessDetail = useCallback(
    (binding: CookieBinding) => (
      <CookieRouteMembers
        binding={binding}
        onToast={(message, tone = "success") => pushToast(message, tone, tone === "error" ? 8000 : undefined)}
        onShared={() => {
          onShared?.();
          void refreshAgents();
        }}
      />
    ),
    [onShared, pushToast, refreshAgents],
  );

  const renderAgentDetail = useCallback(
    (binding: CookieBinding) => (
      <CookieBrowserAgents
        agents={agents}
        commands={agentCommands}
        loading={agentsLoading}
        error={agentsError}
        selectedBinding={binding}
        onRefresh={() => void refreshAgents()}
        onCommand={(targetBrowserId, command, payload) =>
          onCommand(targetBrowserId, command, {
            ...payload,
            noteId: payload?.noteId ?? binding.noteId,
            domain: payload?.domain ?? binding.domain,
          })
        }
        onSetSource={opts?.onSetSource}
      />
    ),
    [agentCommands, agents, agentsError, agentsLoading, onCommand, opts?.onSetSource, refreshAgents],
  );

  return useMemo(
    () => ({ renderAccessDetail, renderAgentDetail }),
    [renderAccessDetail, renderAgentDetail],
  );
}
