import { useMemo, useState } from "react";
import { FilterBar, type FilterDef, type FilterValues } from "../../components/sales-shell";
import type { CookieBinding } from "./cookieBridge";
import type { CookieAgent, CookieAgentCommand } from "./cookieAgents";
import { getCookieSourceLockState } from "./cookieSourceLock";

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

const AGENT_FILTER_DEFS: FilterDef[] = [
  {
    key: "status",
    label: "State",
    showAllLabel: true,
    options: [
      { value: "source", label: "Source", color: "#34d399" },
      { value: "online", label: "Online", color: "#22c55e" },
      { value: "read-only", label: "Read-only", color: "#818cf8" },
      { value: "stale", label: "Stale", color: "#f59e0b" },
    ],
  },
  {
    key: "kind",
    label: "Login",
    showAllLabel: true,
    options: [
      { value: "login", label: "Has login", color: "#34d399" },
      { value: "no-login", label: "No login", color: "#f59e0b" },
    ],
  },
  {
    key: "links",
    label: "Routes",
    showAllLabel: true,
    options: [
      { value: "has-routes", label: "Has routes", color: "#38bdf8" },
      { value: "no-routes", label: "No routes", color: "#94a3b8" },
    ],
  },
];

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

export function CookieBrowserAgents({
  agents,
  selectedBinding,
}: Props) {
  const lockedSourceId = selectedBinding?.sourceBrowserId?.trim() || null;
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const agentRows = useMemo(
    () =>
      agents.map((agent) => {
        const online = isOnline(agent);
        const isLockedSource = lockedSourceId === agent.browser_id;
        const sourceLock = getCookieSourceLockState(lockedSourceId, agent.browser_id);
        const state = isLockedSource ? "source" : !sourceLock.canWrite ? "read-only" : online ? "online" : "stale";
        return { agent, state };
      }),
    [agents, lockedSourceId],
  );
  const filteredAgentRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const stateFilters = filterValues.status ?? [];
    const loginFilters = filterValues.kind ?? [];
    const routeFilters = filterValues.links ?? [];

    return agentRows.filter(({ agent, state }) => {
      const loginState = agent.facebook_has_login ? "login" : "no-login";
      const routeState = agent.route_count > 0 ? "has-routes" : "no-routes";
      const haystack = [
        agent.label ?? "",
        agent.browser_id,
        shortId(agent.browser_id),
        state,
        loginState,
        String(agent.route_count),
        agent.extension_version ?? "",
      ].join(" ").toLowerCase();

      if (q && !haystack.includes(q)) return false;
      if (stateFilters.length && !stateFilters.includes(state)) return false;
      if (loginFilters.length && !loginFilters.includes(loginState)) return false;
      if (routeFilters.length && !routeFilters.includes(routeState)) return false;
      return true;
    });
  }, [agentRows, filterValues, query]);

  return (
    <section className="rdp-section">
      <div className="rdp-section-head">
        <h4>Browser agents diagnostics</h4>
        <span>Keep only for source lock, health, and manual commands</span>
      </div>

      <div className="mb-3">
        <FilterBar
          placeholder="Search agents by browser, ID, state..."
          filters={AGENT_FILTER_DEFS}
          query={query}
          onQueryChange={setQuery}
          values={filterValues}
          onValuesChange={setFilterValues}
          trailing={<span className="hidden text-[10px] text-[var(--muted)] sm:inline">{filteredAgentRows.length}/{agents.length}</span>}
        />
      </div>

      {!agents.length ? (
        <div className="rounded-xl border border-white/10 bg-white/[.03] px-3 py-4 text-[12px] text-[var(--muted)]">
          No browser agents yet. Open Cookie Auto in Chrome 0010/0100 and click Link extension once.
        </div>
      ) : (
        <div className="rdp-table-wrap">
          <table className="rdp-table">
            <thead>
              <tr>
                <th>Browser</th>
                <th>ID</th>
                <th>State</th>
                <th>Routes</th>
                <th>Login</th>
                <th>Last sync</th>
                <th>Last apply</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgentRows.map(({ agent, state }) => (
                <tr key={agent.id}>
                  <td>{agent.label || `Browser ${shortId(agent.browser_id)}`}</td>
                  <td className="mono">{shortId(agent.browser_id)}</td>
                  <td>
                    <span className={`rdp-pill rdp-pill--${state === "source" || state === "online" ? "emerald" : state === "read-only" ? "indigo" : "amber"}`}>{state}</span>
                  </td>
                  <td>{agent.route_count}</td>
                  <td>{agent.facebook_has_login ? "Login cookie" : "No login"}</td>
                  <td>{formatTime(agent.last_sync_at)}</td>
                  <td>{formatTime(agent.last_vault_apply_at)}</td>
                </tr>
              ))}
              {filteredAgentRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-[var(--muted)]">
                    No browser agents match search or filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
