import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppToast } from "../../../components/toast";
import type { Session } from "@supabase/supabase-js";
import { useNotesAuth } from "../../notes/useNotesAuth";
import { useNotes } from "../../notes/useNotes";
import {
  broadcastCookieSyncNow,
  broadcastExtensionAuth,
  broadcastCookieBridgePrefs,
  broadcastSelectedBinding,
} from "../../cookie/extensionBridgeMessages";
import {
  loadCookieBridgePrefs,
  loadSelectedBindingId,
  saveCookieBridgePrefs,
  saveSelectedBindingId,
  type CookieBinding,
} from "../../cookie/cookieBridge";
import { useExtensionAuthHeartbeat } from "../../notes/useExtensionAuthHeartbeat";
import { supabase } from "../../../lib/supabase";
import { Activity, Link2, RefreshCw, Settings } from "lucide-react";
import { EXTENSION_RELEASE_PAGE } from "../../cookie/extensionInstall";
import { CookieInstallHeaderActions } from "../../cookie/CookieInstallHeaderActions";
import { useAppView } from "../../../hooks/useAppView";
import { CookieSettings } from "../../cookie/CookieSettings";
import { CookieAutoSyncTable } from "../../cookie/CookieAutoSyncTable";
import { CookieBrowserAgents } from "../../cookie/CookieBrowserAgents";
import { CookieRouteMembers } from "../../cookie/CookieRouteMembers";
import { hasCookieDeepLink, readCookieDeepLink } from "../../cookie/cookieDeepLink";
import { useCookieBindings } from "../../cookie/useCookieBindings";
import { useCookieVaultMap } from "../../cookie/useCookieVaultMap";
import { useNotesCookieRealtime } from "../../cookie/useNotesCookieRealtime";
import {
  disableCookieRouteInCloud,
  mergeCookieRoutes,
  pullCookieRoutesFromCloud,
  setCookieRouteSource,
  upsertCookieRouteToCloud,
} from "../../cookie/cookieRoutesRepository";
import { useCookieAgents } from "../../cookie/cookieAgents";
import { joinCookieRouteByNoteId } from "../../cookie/noteCookieMembersRepository";
import { NotesAuthGate } from "../../notes/NotesAuthGate";
import { SupabaseMigrateBanner } from "../../cookie/SupabaseMigrateBanner";
import { useCookieSchemaHealth } from "../../cookie/useCookieSchemaHealth";
import { EXTENSION_BUILD } from "../../cookie/extensionBuildInfo";
import { PageHeader } from "./PageHeader";
import { useWorkspaceSearch } from "../../workspace/WorkspaceSearchContext";
import { getOfflineMode } from "../../../lib/offlineMode";

type BridgeStatusBadge = {
  label: string;
  tone: "ready" | "busy" | "warn" | "error";
  title: string;
};

type BridgeActionsMenuProps = {
  status: BridgeStatusBadge;
  onLinkExtension: () => void;
};

function BridgeActionsMenu({
  status,
  onLinkExtension,
}: BridgeActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const pick = (action: () => void) => {
    action();
    setOpen(false);
  };
  const dotClass =
    status.tone === "ready"
      ? "bg-emerald-400"
      : status.tone === "busy"
        ? "bg-amber-300"
        : status.tone === "error"
          ? "bg-rose-400"
          : "bg-slate-300";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        className="relative inline-grid h-[34px] w-[34px] place-items-center rounded-lg border border-white/10 bg-[var(--panel-2)] text-[var(--text)] hover:bg-white/5"
        onClick={() => setOpen((next) => !next)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Route bridge: ${status.label}`}
        title={`Route bridge · ${status.label} · ${status.title}`}
      >
        <Link2 size={14} />
        <span className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="anim-pop absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[var(--panel)] p-1 shadow-xl shadow-black/40"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[var(--text)] hover:bg-white/[.06]"
            onClick={() => pick(onLinkExtension)}
          >
            <Link2 size={14} className="text-indigo-300" />
            Link extension runtime
          </button>
        </div>
      ) : null}
    </div>
  );
}

function bridgeStatusFromState({
  agents,
  agentsError,
  agentsLoading,
  schemaHealth,
  schemaLoading,
}: {
  agents: ReturnType<typeof useCookieAgents>["agents"];
  agentsError: string | null;
  agentsLoading: boolean;
  schemaHealth: ReturnType<typeof useCookieSchemaHealth>["health"];
  schemaLoading: boolean;
}): BridgeStatusBadge {
  if (schemaHealth && !schemaHealth.ok) {
    const failed = schemaHealth.checks.find((check) => !check.ok)?.name ?? "schema";
    return {
      label: "Cloud",
      tone: "error",
      title: `Cloud schema needs attention: ${failed}`,
    };
  }
  if (agentsError) {
    return {
      label: "Agent",
      tone: "error",
      title: `Extension agent error: ${agentsError}`,
    };
  }
  if (schemaLoading || (agentsLoading && agents.length === 0)) {
    return {
      label: "Check",
      tone: "busy",
      title: "Checking extension and cloud readiness",
    };
  }
  if (agents.length === 0) {
    return {
      label: "No agent",
      tone: "warn",
      title: "No browser agent found. Click Link extension from this menu.",
    };
  }
  const onlineAgents = agents.filter((agent) => Date.now() - new Date(agent.last_seen_at).getTime() < 45_000);
  if (onlineAgents.length === 0) {
    return {
      label: "Stale",
      tone: "warn",
      title: "Extension agent exists but has not checked in recently.",
    };
  }
  return {
    label: "Ready",
    tone: "ready",
    title: `${onlineAgents.length}/${agents.length} extension agent(s) online. Cloud schema is ready.`,
  };
}

function CookieSyncSignIn({ shellMode }: { shellMode?: boolean }) {
  const { setHeaderActions } = useWorkspaceSearch();

  useEffect(() => {
    if (!shellMode) return;
    setHeaderActions(<CookieInstallHeaderActions />);
    return () => setHeaderActions(null);
  }, [setHeaderActions, shellMode]);

  return <NotesAuthGate variant="cookie-auto" />;
}

function CookieSyncMain({
  session,
  shellMode,
}: {
  session: Session;
  shellMode?: boolean;
}) {
  const offline = getOfflineMode();
  const cloudSession: Session | null = offline ? null : session;
  const { isSettings, setView } = useAppView();
  const { setHeaderActions } = useWorkspaceSearch();
  const { notes, loading, refresh } = useNotes(session);
  const { bindings, setBindings, addBinding, connectAndCache, updateBinding, removeBinding, pushToExtension } =
    useCookieBindings(notes);
  const { vaultByKey, vaultError, refreshVault } = useCookieVaultMap(cloudSession, bindings);
  const {
    agents,
    commands: agentCommands,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
    sendCommand: sendAgentCommand,
  } = useCookieAgents(session);
  const { health: schemaHealth, loading: schemaLoading, refresh: refreshSchemaHealth } = useCookieSchemaHealth(true);
  const { pushToast } = useAppToast();
  const [deepLinkDone, setDeepLinkDone] = useState(false);
  const [realtimeOn, setRealtimeOn] = useState(() => loadCookieBridgePrefs().realtimeSync);
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(() => loadSelectedBindingId());
  const [autoRan, setAutoRan] = useState(false);
  const [autoRoutesLoaded, setAutoRoutesLoaded] = useState(false);
  const bindingsRef = useRef(bindings);
  const notesRef = useRef(notes);
  bindingsRef.current = bindings;
  notesRef.current = notes;
  const notesKey = useMemo(
    () => notes.map((n) => `${n.id}:${n.title}`).join("|"),
    [notes],
  );

  useEffect(() => {
    if (selectedBindingId) return;
    const first = bindings.find((b) => b.enabled);
    if (first) setSelectedBindingId(first.id);
  }, [bindings, selectedBindingId]);

  useEffect(() => {
    saveSelectedBindingId(selectedBindingId);
    const row = bindings.find((b) => b.id === selectedBindingId);
    broadcastSelectedBinding(row?.noteId ?? null);
  }, [selectedBindingId, bindings]);

  useEffect(() => {
    const prefs = loadCookieBridgePrefs();
    broadcastCookieBridgePrefs(prefs);
  }, []);

  useExtensionAuthHeartbeat(session);


  const onLinkExtension = useCallback(async () => {
    if (offline) {
      pushToast("Offline mode: linking extension runtime requires Supabase.", "warn");
      return;
    }
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (!s) {
      pushToast("Not signed in.", "warn");
      return;
    }
    let nextBindings = bindings;
    const cloud = await pullCookieRoutesFromCloud(s, nextBindings, notes);
    if (cloud.ok) {
      nextBindings = cloud.bindings;
      setBindings(cloud.bindings);
    } else {
      pushToast(cloud.error, "warn", 8000);
    }

    broadcastExtensionAuth({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
      user: s.user,
    });
    if (nextBindings.length > 0) {
      pushToExtension(nextBindings);
      pushToast("Extension runtime linked. Cloud routes will arrive via realtime.", "success");
    } else {
      pushToExtension([]);
      pushToast("Session sent to extension. Create a new route to publish directly to cloud.", "info");
    }
  }, [bindings, notes, pushToExtension, pushToast, setBindings]);

  const publishRouteToCloud = useCallback(
    async (route: CookieBinding, opts: { silent?: boolean } = {}) => {
      if (offline) return false;
      const res = await upsertCookieRouteToCloud(session, route);
      if (!res.ok) {
        pushToast(res.error, "error", 8000);
        return false;
      }
      if (!opts.silent) pushToast("Route published to cloud.", "success");
      return true;
    },
    [offline, pushToast, session],
  );

  const bindingsSignature = useCallback((list: CookieBinding[]) => {
    return [...list]
      .map(
        (b) =>
          `${b.id}|${b.noteId}|${b.domain}|${b.syncId}|${b.sourceBrowserId ?? ""}|${b.noteTitle ?? ""}|${b.enabled ? 1 : 0}`,
      )
      .sort()
      .join(";");
  }, []);

  const refreshCloudRoutes = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (offline) return;
    const res = await pullCookieRoutesFromCloud(session, bindingsRef.current, notesRef.current);
    if (!res.ok) {
      if (!opts.silent) pushToast(res.error, "error", 8000);
      return;
    }
    if (bindingsSignature(res.bindings) === bindingsSignature(bindingsRef.current)) return;
    setBindings(res.bindings);
    pushToExtension(res.bindings);
    if (!opts.silent) {
      pushToast(
        res.count ? `Refreshed ${res.count} cloud route(s) into extension runtime.` : "No cloud routes found.",
        res.count ? "success" : "info",
      );
    }
  }, [bindingsSignature, offline, pushToExtension, pushToast, session, setBindings]);

  const onRealtimeRefresh = useCallback(() => {
    void refresh({ silent: true });
    void refreshVault();
    void refreshCloudRoutes({ silent: true });
  }, [refreshCloudRoutes, refresh, refreshVault]);

  useNotesCookieRealtime(session, onRealtimeRefresh, realtimeOn);

  useEffect(() => {
    if (autoRoutesLoaded || loading || !session) return;
    setAutoRoutesLoaded(true);
    void refreshCloudRoutes({ silent: true });
  }, [autoRoutesLoaded, loading, refreshCloudRoutes, session]);

  /** Keep cookie_bridge_routes.note_title in sync when a note is renamed in Notes. */
  useEffect(() => {
    if (!session || offline || loading) return;
    const list = bindingsRef.current;
    const noteList = notesRef.current;
    const stale = list.filter((b) => {
      if (!b.enabled || !b.noteId?.trim()) return false;
      const note = noteList.find((n) => n.id === b.noteId);
      if (!note?.title?.trim()) return false;
      return (b.noteTitle?.trim() ?? "") !== note.title.trim();
    });
    if (stale.length === 0) return;
    let cancelled = false;
    void (async () => {
      for (const row of stale) {
        if (cancelled) return;
        const note = noteList.find((n) => n.id === row.noteId);
        if (!note) continue;
        await publishRouteToCloud({ ...row, noteTitle: note.title }, { silent: true });
      }
      if (!cancelled) void refreshCloudRoutes({ silent: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [notesKey, session, offline, loading, publishRouteToCloud, refreshCloudRoutes]);

  const onJoinByNoteId = useCallback(
    async (noteId: string, domain: string) => {
      const res = await joinCookieRouteByNoteId({ noteId, domain });
      if (!res.ok) {
        pushToast(res.error, "error", 8000);
        return false;
      }
      const next = mergeCookieRoutes(bindings, [res.route], notes);
      setBindings(next);
      const joined = next.find((binding) => binding.noteId === res.route.note_id && binding.domain === res.route.domain);
      if (joined) setSelectedBindingId(joined.id);
      pushToExtension(next);
      pushToast("Shared route joined. You can Load cookies, but Sync Now is disabled.", "success");
      return true;
    },
    [bindings, notes, pushToExtension, pushToast, setBindings],
  );

  useEffect(() => {
    if (deepLinkDone || loading) return;
    const link = readCookieDeepLink();
    if (!hasCookieDeepLink(link)) return;
    if (!notes.length && !link.syncId && !link.noteId) return;

    void connectAndCache({
      noteId: link.noteId ?? undefined,
      syncId: link.syncId ?? undefined,
      domain: link.domain!,
      pass: link.pass ?? undefined,
    }).then((res) => {
      setDeepLinkDone(true);
      if (res.ok) {
        void publishRouteToCloud(res.row, { silent: true }).then((ok) => {
          if (ok) pushToast("Route created from URL and published to cloud.", "success");
        });
        void onLinkExtension();
      } else {
        pushToast(res.error, "error");
      }
    });
  }, [notes, loading, deepLinkDone, connectAndCache, onLinkExtension, publishRouteToCloud, pushToast]);

  const onSyncNow = useCallback((noteId?: string) => {
    const row = bindings.find((b) => b.id === selectedBindingId);
    const targetNoteId = noteId ?? row?.noteId;
    broadcastCookieSyncNow(targetNoteId);
    if (targetNoteId) {
      pushToast(
        `Sync requested in extension — ${row?.noteTitle ?? "selected route"}. Open extension popup → Sync now / Load cookies.`,
        "info",
      );
    } else {
      pushToast("Select a route in the table before Sync.", "warn");
    }
    setTimeout(() => void refresh({ silent: true }), 2500);
  }, [bindings, pushToast, refresh, selectedBindingId]);

  useEffect(() => {
    if (autoRan || loading) return;
    const auto = new URLSearchParams(window.location.search).get("auto");
    if (!auto) return;
    const actions = new Set(auto.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
    if (!actions.size) return;
    setAutoRan(true);

    void (async () => {
      if (actions.has("link")) await onLinkExtension();
      if (actions.has("sync")) window.setTimeout(() => onSyncNow(), 1200);
    })();
  }, [autoRan, loading, onLinkExtension, onSyncNow]);

  const selectedBinding = bindings.find((b) => b.id === selectedBindingId);

  const onAgentCommand = async (
    targetBrowserId: string,
    command: string,
    payload: Record<string, unknown> = {},
  ) => {
    const noteId =
      typeof payload.noteId === "string" && payload.noteId.trim()
        ? payload.noteId.trim()
        : command === "sync-now" || command === "apply-vault"
          ? selectedBinding?.noteId
          : undefined;
    const domain =
      typeof payload.domain === "string" && payload.domain.trim()
        ? payload.domain.trim()
        : selectedBinding?.domain || ".facebook.com";
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
  };

  const onSetSourceAgent = async (agent: (typeof agents)[number]) => {
    if (!selectedBinding) {
      pushToast("Select a route before setting source.", "warn");
      return;
    }
    if (!agent.facebook_has_login) {
      pushToast("This browser has no Facebook login cookies, so it cannot be the source.", "warn");
      return;
    }
    const res = await setCookieRouteSource(session, selectedBinding, agent.browser_id, agent.label);
    if (!res.ok) {
      pushToast(res.error, "error", 8000);
      return;
    }
    setBindings((prev) =>
      prev.map((b) =>
        b.id === selectedBinding.id
          ? { ...b, sourceBrowserId: res.sourceBrowserId, sourceLabel: res.sourceLabel }
          : b,
      ),
    );
    pushToExtension(
      bindings.map((b) =>
        b.id === selectedBinding.id
          ? { ...b, sourceBrowserId: res.sourceBrowserId, sourceLabel: res.sourceLabel }
          : b,
      ),
    );
    pushToast(`Locked source: ${agent.label || agent.browser_id.slice(0, 8)}. Targets are read-only.`, "success");
  };

  const cookieSettingsHeaderAction = useMemo(
    () => (
      <button
        type="button"
        className="inline-grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-[var(--panel-2)] text-[var(--muted)] transition-colors hover:bg-white/5 hover:text-[var(--text)]"
        onClick={() => setView("settings")}
        title="Cookie settings"
        aria-label="Cookie settings"
      >
        <Settings size={14} />
      </button>
    ),
    [setView],
  );

  const cookieHeaderActions = useMemo(
    () => <CookieInstallHeaderActions trailing={cookieSettingsHeaderAction} />,
    [cookieSettingsHeaderAction],
  );

  useEffect(() => {
    if (!shellMode) return;
    setHeaderActions(cookieHeaderActions);
    return () => setHeaderActions(null);
  }, [cookieHeaderActions, setHeaderActions, shellMode]);

  useEffect(() => {
    if (!isSettings) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setView("main");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSettings, setView]);

  const bridgeStatus = useMemo(
    () =>
      bridgeStatusFromState({
        agents,
        agentsError,
        agentsLoading,
        schemaHealth,
        schemaLoading,
      }),
    [agents, agentsError, agentsLoading, schemaHealth, schemaLoading],
  );
  const routeActionsKey = `${bridgeStatus.tone}:${bridgeStatus.label}:${agents.length}:${schemaHealth?.ok ?? "unknown"}`;

  const routeActions = useMemo(() => (
    <>
      <a
        href={EXTENSION_RELEASE_PAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden h-[34px] items-center rounded-lg border border-white/10 bg-[var(--panel-2)] px-2.5 text-[11px] text-[var(--muted)] hover:text-[var(--text)] xl:inline-flex"
        title="All extension releases"
      >
        Releases
      </a>
      <BridgeActionsMenu
        status={bridgeStatus}
        onLinkExtension={() => void onLinkExtension()}
      />
      <button
        type="button"
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 text-xs font-medium text-indigo-100 hover:bg-indigo-500/30"
        onClick={() => onSyncNow()}
      >
        <RefreshCw size={14} />
        Sync now
      </button>
    </>
  ), [
    bridgeStatus,
    onLinkExtension,
    onSyncNow,
  ]);

  const pageHeaderActions = useMemo(
    () => (
      <>
        <CookieInstallHeaderActions trailing={cookieSettingsHeaderAction} />
        {routeActions}
      </>
    ),
    [cookieSettingsHeaderAction, routeActions],
  );

  const settingsModal =
    isSettings && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[1200] grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Cookie settings"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setView("main");
            }}
          >
            <CookieSettings
              variant="modal"
              onBack={() => setView("main")}
              onPrefsChange={(p) => {
                setRealtimeOn(p.realtimeSync);
                broadcastCookieBridgePrefs(p);
              }}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={shellMode ? "" : "p-6"}>
      {offline ? (
        <p className="mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          Offline mode is enabled. Cloud routes, sharing, sync now, and vault status are disabled.
        </p>
      ) : null}
      {!shellMode ? (
        <PageHeader
          title="Cookie sync"
          desc={`Domain → note binding · vault · extension v${EXTENSION_BUILD.version} (${EXTENSION_BUILD.updated})`}
          actions={pageHeaderActions}
        />
      ) : null}

      <div className="mb-4">
        <CookieAutoSyncTable
          bindings={bindings}
          notes={notes}
          loading={loading}
          selectedBindingId={selectedBindingId}
          onSelect={(id) => {
            setSelectedBindingId(id);
            pushToExtension();
          }}
          onAdd={(noteId, domain, pass) => {
            const row = addBinding(noteId, domain, pass);
            if (!row) return;
            setSelectedBindingId(row.id);
            const nextBindings = [
              ...bindings.filter((binding) => {
                if (binding.domain !== row.domain) return true;
                if (row.noteId && binding.noteId === row.noteId) return false;
                if (row.syncId && binding.syncId === row.syncId) return false;
                return true;
              }),
              row,
            ];
            if (offline) {
              pushToExtension(nextBindings);
              pushToast("Route saved locally (offline).", "info");
              return;
            }
            void publishRouteToCloud(row, { silent: true }).then((ok) => {
              if (!ok) {
                removeBinding(row.id);
                setSelectedBindingId(null);
                return;
              }
              pushToExtension(nextBindings);
              pushToast("Route saved to cloud. Linked browsers receive it via realtime.", "success");
              void refreshCloudRoutes({ silent: true });
            });
          }}
          onJoinByNoteId={onJoinByNoteId}
          onUpdate={(id, patch) => {
            const current = bindings.find((binding) => binding.id === id);
            if (!current) return;
            const nextRoute = { ...current, ...patch };
            updateBinding(id, patch);
            if (offline) {
              pushToExtension(bindings.map((binding) => (binding.id === id ? nextRoute : binding)));
              pushToast("Route updated locally (offline).", "info");
              return;
            }
            void publishRouteToCloud(nextRoute, { silent: true }).then((ok) => {
              if (!ok) return;
              pushToExtension(bindings.map((binding) => (binding.id === id ? nextRoute : binding)));
              pushToast("Route updated in cloud. Linked browsers receive it via realtime.", "success");
              void refreshCloudRoutes({ silent: true });
            });
          }}
          onRemove={(id) => {
            const current = bindings.find((binding) => binding.id === id);
            if (!current) return;
            if (offline) {
              removeBinding(id);
              if (selectedBindingId === id) setSelectedBindingId(null);
              pushToExtension(bindings.filter((binding) => binding.id !== id));
              pushToast("Route removed locally (offline).", "info");
              return;
            }
            void disableCookieRouteInCloud(session, current).then((res) => {
              if (!res.ok) {
                pushToast(res.error, "error", 8000);
                return;
              }
              removeBinding(id);
              if (selectedBindingId === id) setSelectedBindingId(null);
              pushToExtension(bindings.filter((binding) => binding.id !== id));
              pushToast("Route disabled in cloud. Linked browsers will remove it via realtime.", "success");
              void refreshCloudRoutes({ silent: true });
            });
          }}
          onSyncRoute={(b) => onSyncNow(b.noteId)}
          vaultByKey={vaultByKey}
          vaultError={vaultError}
          toolbarActions={shellMode ? routeActions : null}
          toolbarActionsKey={shellMode ? routeActionsKey : ""}
          renderAccessDetail={(binding) => (
            <CookieRouteMembers
              binding={binding}
              onToast={(message, tone = "success") => pushToast(message, tone, tone === "error" ? 8000 : undefined)}
              onShared={() => {
                void refreshCloudRoutes({ silent: true });
                void refreshAgents();
              }}
            />
          )}
          renderAgentDetail={(binding) => (
            <CookieBrowserAgents
              agents={agents}
              commands={agentCommands}
              loading={agentsLoading}
              error={agentsError}
              selectedBinding={binding}
              onRefresh={() => void refreshAgents()}
              onCommand={onAgentCommand}
              onSetSource={onSetSourceAgent}
            />
          )}
          onRefresh={() => {
            void refresh();
            if (!offline) {
              void refreshVault();
              void refreshCloudRoutes({ silent: true });
            }
          }}
        />
      </div>

      <SupabaseMigrateBanner
        health={schemaHealth}
        onRecheck={() => {
          void refreshSchemaHealth().then((h) => {
            if (h?.ok) pushToast("Schema cookie bridge: 4/4 OK", "success");
            else pushToast("Schema incomplete — see checklist below.", "warn", 8000);
          });
        }}
      />

      {settingsModal}

    </div>
  );
}

export function CookieSyncScreen({
  shellMode,
}: {
  shellMode?: boolean;
  query?: string;
} = {}) {
  const { session, loading: authLoading, offline } = useNotesAuth();

  if (authLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center p-8 text-sm text-[var(--muted)]" role="status">
        Loading Cookie Auto…
      </div>
    );
  }

  if (!session) {
    return <CookieSyncSignIn shellMode={shellMode} />;
  }

  return <CookieSyncMain session={session} shellMode={shellMode} />;
}
