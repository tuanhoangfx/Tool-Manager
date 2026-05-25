import { Activity, Bot, CheckCircle2, CloudDownload, ExternalLink, LockKeyhole, RefreshCw, RotateCw, UploadCloud } from "lucide-react";
import { Glass } from "../../theme/p0008";
import type { CookieBinding } from "./cookieBridge";
import type { CookieAgent, CookieAgentCommand } from "./cookieAgents";

type Props = {
  agents: CookieAgent[];
  commands: CookieAgentCommand[];
  loading: boolean;
  error: string | null;
  selectedBinding?: CookieBinding;
  onRefresh: () => void;
  onCommand: (
    targetBrowserId: string,
    command: string,
    payload?: Record<string, unknown>,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onSetSource?: (agent: CookieAgent) => Promise<void>;
};

function shortId(id: string) {
  return id.slice(0, 8);
}

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return iso.slice(0, 16);
  }
}

function isOnline(agent: CookieAgent) {
  return Date.now() - new Date(agent.last_seen_at).getTime() < 25_000;
}

function lastCommandFor(commands: CookieAgentCommand[], browserId: string) {
  return commands.find((c) => c.target_browser_id === browserId || c.target_browser_id == null);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringList(value: unknown, limit = 8) {
  return Array.isArray(value)
    ? value
        .slice(0, limit)
        .map((item) => String(item))
        .join(",")
    : "";
}

function commandDetail(command: CookieAgentCommand) {
  const parts: string[] = [];
  if (command.error) parts.push(command.error);
  if (!command.result) return parts.join("\n");
  const result = command.result;
  const rows = Array.isArray(result.results) ? result.results : [];
  const first = objectValue(rows[0]) ?? objectValue(result);
  if (first) {
    const facebook = objectValue(first.facebook);
    const vaultSummary = objectValue(first.vaultSummary);
    const vaultSummaryNames = objectValue(vaultSummary?.vaultNames);
    const vaultNames = objectValue(first.vaultNames);
    const firstFailedDetails = Array.isArray(first.failedDetails)
      ? first.failedDetails
          .slice(0, 3)
          .map((item) => {
            const row = objectValue(item);
            const errors = stringList(row?.errors, 2);
            return `${String(row?.name ?? "?")}${errors ? `(${errors})` : ""}`;
          })
          .join(" · ")
      : "";
    const summary = [
      facebook?.hasLogin != null ? `fbLogin=${String(facebook.hasLogin)}` : null,
      facebook?.count != null ? `fbCookies=${String(facebook.count)}` : null,
      stringList(facebook?.keyNames) ? `fbKeys=${stringList(facebook?.keyNames)}` : null,
      vaultSummary?.count != null ? `vaultCount=${String(vaultSummary.count)}` : null,
      vaultSummaryNames?.hasFacebookLogin != null ? `vaultLogin=${String(vaultSummaryNames.hasFacebookLogin)}` : null,
      stringList(vaultSummaryNames?.keyNames) ? `vaultKeys=${stringList(vaultSummaryNames?.keyNames)}` : null,
      first.error ? `rowError=${String(first.error)}` : null,
      first.reason ? `reason=${String(first.reason)}` : null,
      first.applied != null ? `applied=${String(first.applied)}` : null,
      first.decrypted != null ? `decrypted=${String(first.decrypted)}` : null,
      first.serverCount != null ? `serverCount=${String(first.serverCount)}` : null,
      vaultNames?.hasFacebookLogin != null ? `vaultLogin=${String(vaultNames.hasFacebookLogin)}` : null,
      stringList(vaultNames?.keyNames) ? `vaultKeys=${stringList(vaultNames?.keyNames)}` : null,
      stringList(vaultNames?.missingFacebookLogin)
        ? `missingLogin=${stringList(vaultNames?.missingFacebookLogin)}`
        : null,
      stringList(first.appliedNames) ? `appliedNames=${stringList(first.appliedNames)}` : null,
      stringList(first.failedNames) ? `failedNames=${stringList(first.failedNames)}` : null,
      firstFailedDetails ? `failedDetails=${firstFailedDetails}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (summary) parts.push(summary);
  }
  try {
    parts.push(JSON.stringify(result));
  } catch {
    parts.push(String(result));
  }
  return parts.join("\n");
}

export function CookieBrowserAgents({
  agents,
  commands,
  loading,
  error,
  selectedBinding,
  onRefresh,
  onCommand,
  onSetSource,
}: Props) {
  const noteId = selectedBinding?.noteId?.trim();
  const domain = selectedBinding?.domain?.trim() || ".facebook.com";
  const lockedSourceId = selectedBinding?.sourceBrowserId?.trim() || null;
  const sourceAgent = lockedSourceId
    ? agents.find((agent) => agent.browser_id === lockedSourceId)
    : agents.find((agent) => agent.facebook_has_login);

  return (
    <Glass tone="emerald" label="Browser agents">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[var(--muted)]">
          E0001 profiles receive Supabase commands in the background. No mouse, no keyboard focus.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] text-[var(--muted)]">
            {lockedSourceId
              ? `Locked source ${shortId(lockedSourceId)}`
              : sourceAgent
                ? `Suggested source ${shortId(sourceAgent.browser_id)}`
                : "Choose one source"}
          </span>
          <button type="button" className="btn-ghost btn text-[11px]" onClick={onRefresh}>
            <RefreshCw size={13} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
          {error}
        </div>
      ) : null}

      {!agents.length ? (
        <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-4 text-[12px] text-[var(--muted)]">
          No browser agents yet. Open Cookie Auto in Chrome 0010/0100 and click Link extension once.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {agents.map((agent) => {
            const online = isOnline(agent);
            const last = lastCommandFor(commands, agent.browser_id);
            const isLockedSource = lockedSourceId === agent.browser_id;
            const canPublish = Boolean(noteId && agent.facebook_has_login && isLockedSource);
            return (
              <div
                key={agent.id}
                className={`rounded-xl border p-3 ${
                  isLockedSource
                    ? "border-emerald-400/35 bg-emerald-950/20 shadow-[0_0_24px_rgba(16,185,129,.08)]"
                    : "border-white/10 bg-slate-950/35"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                      <Bot size={15} className={online ? "text-emerald-300" : "text-slate-400"} />
                      <span className="truncate">{agent.label || `Browser ${shortId(agent.browser_id)}`}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--muted)]">
                      id <code>{shortId(agent.browser_id)}</code> · v{agent.extension_version ?? "?"} · routes{" "}
                      {agent.route_count}
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      isLockedSource
                        ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-100"
                        : online
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                        : "border-slate-400/25 bg-slate-400/10 text-slate-300"
                    }`}
                  >
                    {isLockedSource ? "source" : online ? "online" : "stale"}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-[11px] text-[var(--muted)] sm:grid-cols-3">
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.14em]">Facebook</div>
                    <div className={agent.facebook_has_login ? "text-emerald-300" : "text-amber-300"}>
                      {agent.facebook_has_login ? "Login cookie" : "No login"} · {agent.facebook_cookie_count}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.14em]">Last sync</div>
                    <div>{formatTime(agent.last_sync_at)}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-[0.14em]">Last load</div>
                    <div>{formatTime(agent.last_vault_apply_at)}</div>
                  </div>
                </div>

                {last ? (
                  <div className="mt-3 rounded-lg border border-white/10 bg-white/[.03] px-2 py-1 text-[10px] text-[var(--muted)]">
                    <div className="flex items-center gap-2">
                      <Activity size={12} />
                      <span>
                        {last.command} · {last.status}
                      </span>
                    </div>
                    {commandDetail(last) ? (
                      <div className="mt-1 whitespace-pre-wrap break-all font-mono text-[9px] leading-4 text-slate-300">
                        {commandDetail(last)}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-ghost btn text-[11px]"
                    onClick={() => onCommand(agent.browser_id, "pull-routes", { domain })}
                  >
                    <CloudDownload size={13} />
                    Pull routes
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn text-[11px]"
                    disabled={!noteId || !agent.facebook_has_login || !onSetSource}
                    onClick={() => void onSetSource?.(agent)}
                    title="Lock this route so only this browser can publish new vault versions"
                  >
                    <LockKeyhole size={13} />
                    Set source
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn text-[11px]"
                    disabled={!canPublish}
                    title={
                      lockedSourceId
                        ? canPublish
                          ? "Publish from locked source"
                          : "Read-only target: choose Set source first if this should publish"
                        : "Choose Set source before publishing"
                    }
                    onClick={() =>
                      onCommand(agent.browser_id, "sync-now", {
                        noteId,
                        domain,
                        forceUpload: true,
                        requireFacebookLogin: true,
                        sourceBrowserId: lockedSourceId,
                        vaultPassOverride: "",
                      })
                    }
                  >
                    <UploadCloud size={13} />
                    {isLockedSource ? "Publish version" : "Read-only"}
                  </button>
                  <button
                    type="button"
                    className="btn text-[11px]"
                    disabled={!noteId}
                    onClick={() =>
                      onCommand(agent.browser_id, "apply-vault", {
                        noteId,
                        domain,
                        clearBeforeLoad: true,
                        openSite: true,
                        refreshTab: true,
                        confirmSession: true,
                        vaultPassOverride: "",
                      })
                    }
                  >
                    <CheckCircle2 size={13} />
                    Apply latest
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn text-[11px]"
                    onClick={() => onCommand(agent.browser_id, "check-facebook", { domain })}
                  >
                    <Activity size={13} />
                    Check
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn text-[11px]"
                    disabled={!noteId}
                    onClick={() =>
                      onCommand(agent.browser_id, "inspect-vault", {
                        noteId,
                        domain,
                        vaultPassOverride: "",
                      })
                    }
                  >
                    <Activity size={13} />
                    Inspect vault
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn text-[11px]"
                    onClick={() => onCommand(agent.browser_id, "open-facebook", { domain, activate: false })}
                  >
                    <ExternalLink size={13} />
                    Open FB
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn text-[11px]"
                    onClick={() => onCommand(agent.browser_id, "reload-extension", { domain })}
                  >
                    <RotateCw size={13} />
                    Reload ext
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Glass>
  );
}
