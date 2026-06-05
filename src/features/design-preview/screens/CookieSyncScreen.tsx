import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppToast } from "../../../components/toast";
import type { Session } from "@supabase/supabase-js";
import { useNotesAuth } from "../../notes/useNotesAuth";
import { useNotes } from "../../notes/useNotes";
import {
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
import { relayActiveSessionsToExtension } from "../../../lib/relay-extension-sessions";
import { useCookieRouteDetailRenderers } from "../../cookie/useCookieRouteDetailRenderers";
import { shouldShowExtensionLinkToast } from "../../../lib/extension-link-toast";
import { supabase } from "../../../lib/supabase";
import { CookieExtensionFab } from "../../cookie/CookieExtensionFab";
import { CookieAutoSyncTable } from "../../cookie/CookieAutoSyncTable";
import { hasCookieDeepLink, readCookieDeepLink } from "../../cookie/cookieDeepLink";
import { useCookieBindings } from "../../cookie/useCookieBindings";
import { useCookieVaultMap } from "../../cookie/useCookieVaultMap";
import { useNotesCookieRealtime } from "../../cookie/useNotesCookieRealtime";
import {
  disableCookieRouteInCloud,
  mergeCookieRoutes,
  pullCookieRoutesFromCloud,
  upsertCookieRouteToCloud,
} from "../../cookie/cookieRoutesRepository";
import { joinCookieRouteByNoteId } from "../../cookie/noteCookieMembersRepository";
import { NotesAuthGate } from "../../notes/NotesAuthGate";
import { SupabaseMigrateBanner } from "../../cookie/SupabaseMigrateBanner";
import { useCookieSchemaHealth } from "../../cookie/useCookieSchemaHealth";
import { EXTENSION_BUILD } from "../../cookie/extensionBuildInfo";
import { PageHeader } from "./PageHeader";
import { getOfflineMode } from "../../../lib/offlineMode";
import { WorkspaceLoadingView } from "../../../components/sales-shell/HubLoadingView";

type BridgeStatusBadge = {
  label: string;
  tone: "ready" | "busy" | "warn" | "error";
  title: string;
};

function BridgeStatusIndicator({ status }: { status: BridgeStatusBadge }) {
  const dotClass =
    status.tone === "ready"
      ? "bg-emerald-400"
      : status.tone === "busy"
        ? "bg-amber-300"
        : status.tone === "error"
          ? "bg-rose-400"
          : "bg-slate-300";
  const ringClass =
    status.tone === "ready"
      ? "border-emerald-400/35 text-emerald-200"
      : status.tone === "busy"
        ? "border-amber-400/35 text-amber-100"
        : status.tone === "error"
          ? "border-rose-400/35 text-rose-200"
          : "border-white/10 text-[var(--muted)]";

  return (
    <span
      className={`inline-flex h-[var(--hub-control-h)] shrink-0 items-center gap-1.5 rounded-lg border bg-[var(--panel-2)] px-2.5 text-[11px] font-medium ${ringClass}`}
      title={`Extension bridge · ${status.title}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      {status.label}
    </span>
  );
}

function bridgeStatusFromState({
  schemaHealth,
  schemaLoading,
}: {
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
  if (schemaLoading && !schemaHealth) {
    return {
      label: "Check",
      tone: "busy",
      title: "Checking cloud schema readiness",
    };
  }
  return {
    label: "Ready",
    tone: "ready",
    title: "Cloud schema is ready. Sync and load run in the extension.",
  };
}

function CookieSyncSignIn({ shellMode }: { shellMode?: boolean }) {
  return <NotesAuthGate variant="cookie-auto" />;
}

function CookieSyncMain({
  session,
  shellMode,
  tabActive = true,
}: {
  session: Session;
  shellMode?: boolean;
  tabActive?: boolean;
}) {
  const offline = getOfflineMode();
  const cloudSession: Session | null = offline ? null : session;
  const { notes, loading, refresh } = useNotes(session);
  const { bindings, setBindings, addBinding, connectAndCache, updateBinding, removeBinding, pushToExtension } =
    useCookieBindings(notes);
  const { vaultByKey, vaultError, refreshVault } = useCookieVaultMap(cloudSession, bindings);
  const { health: schemaHealth, loading: schemaLoading, refresh: refreshSchemaHealth } = useCookieSchemaHealth(true);
  const { pushToast } = useAppToast();
  const [deepLinkDone, setDeepLinkDone] = useState(false);
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

  /** Session relay + cloud route pull → extension (merged former Link extension + Refresh routes). */
  const refreshCookieBridge = useCallback(
    async (opts?: { silent?: boolean }) => {
      const showToast = opts?.silent !== true;
      if (offline) {
        if (showToast) pushToast("Offline mode: extension bridge requires Supabase.", "warn");
        return;
      }
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!s) {
        if (showToast) pushToast("Not signed in.", "warn");
        return;
      }
      await relayActiveSessionsToExtension();
      const res = await pullCookieRoutesFromCloud(session, bindingsRef.current, notesRef.current);
      if (!res.ok) {
        if (showToast) pushToast(res.error, "error", 8000);
        return;
      }
      setBindings(res.bindings);
      pushToExtension(res.bindings);
      if (showToast && shouldShowExtensionLinkToast()) {
        pushToast("Extension bridge refreshed (session + routes from cloud).", "success");
      }
    },
    [notes, offline, pushToExtension, pushToast, session, setBindings],
  );

  const onRealtimeRefresh = useCallback(() => {
    void refresh({ silent: true });
    void refreshVault();
    void refreshCookieBridge({ silent: true });
  }, [refresh, refreshCookieBridge, refreshVault]);

  useNotesCookieRealtime(session, onRealtimeRefresh, tabActive && !offline);

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
      if (!cancelled) void refreshCookieBridge({ silent: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [notesKey, session, offline, loading, publishRouteToCloud, refreshCookieBridge]);

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
      pushToast("Shared route joined. Use extension Load on this browser; publish via owner browser only.", "success");
      return true;
    },
    [bindings, notes, pushToExtension, pushToast, setBindings],
  );

  useEffect(() => {
    if (deepLinkDone || loading) return;
    const link = readCookieDeepLink();
    if (!hasCookieDeepLink(link)) return;
    if (!notes.length && !link.syncId && !link.noteId) return;

    const deepKey = `p0020:deep-link:${link.noteId ?? ""}|${link.syncId ?? ""}|${link.domain ?? ""}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(deepKey) === "1") {
      setDeepLinkDone(true);
      return;
    }

    void connectAndCache({
      noteId: link.noteId ?? undefined,
      syncId: link.syncId ?? undefined,
      domain: link.domain!,
      pass: link.pass ?? undefined,
    }).then((res) => {
      setDeepLinkDone(true);
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem(deepKey, "1");
      if (res.ok) {
        void publishRouteToCloud(res.row, { silent: true }).then((ok) => {
          if (ok) pushToast("Route created from URL and published to cloud.", "success");
        });
        void refreshCookieBridge({ silent: true });
      } else {
        pushToast(res.error, "error");
      }
    });
  }, [notes, loading, deepLinkDone, connectAndCache, refreshCookieBridge, publishRouteToCloud, pushToast]);

  useEffect(() => {
    if (autoRan || loading) return;
    const auto = new URLSearchParams(window.location.search).get("auto");
    if (!auto) return;
    const actions = new Set(auto.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
    if (!actions.size) return;
    const autoKey = `p0020:auto:${auto}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(autoKey) === "1") {
      setAutoRan(true);
      return;
    }
    setAutoRan(true);
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem(autoKey, "1");

    if (actions.has("link")) void refreshCookieBridge({ silent: true });
  }, [autoRan, loading, refreshCookieBridge]);

  const selectedBinding = bindings.find((b) => b.id === selectedBindingId);

  const { renderAccessDetail } = useCookieRouteDetailRenderers(session, {
    onShared: () => void refreshCloudRoutes({ silent: true }),
  });

  const bridgeStatus = useMemo(
    () => bridgeStatusFromState({ schemaHealth, schemaLoading }),
    [schemaHealth, schemaLoading],
  );
  const toolbarBridgeKey = `${bridgeStatus.tone}:${bridgeStatus.label}:${schemaHealth?.ok ?? "unknown"}`;

  const cookieBootLoading = tabActive && schemaLoading && !schemaHealth;

  const bridgeStatusChip = useMemo(() => <BridgeStatusIndicator status={bridgeStatus} />, [bridgeStatus]);

  const pageHeaderActions = useMemo(() => <>{bridgeStatusChip}</>, [bridgeStatusChip]);

  const onRefreshAll = useCallback(() => {
    void refresh();
    if (offline) return;
    void refreshVault();
    void refreshCookieBridge({ silent: false });
  }, [offline, refresh, refreshCookieBridge, refreshVault]);

  return (
    <>
      {shellMode ? <CookieExtensionFab active={tabActive} /> : null}
      {tabActive && cookieBootLoading ? <WorkspaceLoadingView screen="cookie" variant="overlay" /> : null}
      <div className={shellMode ? "" : "p-6"}>
      {!shellMode ? (
        <>
          {offline ? (
            <p className="mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
              Offline mode is enabled. Cloud routes, sharing, and vault status are disabled.
            </p>
          ) : null}
          <PageHeader
            title="Cookie sync"
            desc={`Domain → note binding · vault · extension v${EXTENSION_BUILD.version} (${EXTENSION_BUILD.updated})`}
            actions={pageHeaderActions}
          />
        </>
      ) : null}

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
              pushToast("Route saved to cloud.", "success");
              void refreshCookieBridge({ silent: true });
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
              pushToast("Route updated in cloud.", "success");
              void refreshCookieBridge({ silent: true });
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
          vaultByKey={vaultByKey}
          vaultError={vaultError}
          toolbarActions={null}
          toolbarActionsKey=""
          renderAccessDetail={renderAccessDetail}
          onRefresh={onRefreshAll}
        />

      {shellMode && offline ? (
        <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          Offline mode is enabled. Cloud routes, sharing, and vault status are disabled.
        </p>
      ) : null}

      <SupabaseMigrateBanner
        health={schemaHealth}
        onRecheck={() => {
          void refreshSchemaHealth().then((h) => {
            if (h?.ok) pushToast("Schema cookie bridge: 4/4 OK", "success");
            else pushToast("Schema incomplete — see checklist below.", "warn", 8000);
          });
        }}
      />

      </div>
    </>
  );
}

export function CookieSyncScreen({
  shellMode,
  tabActive = true,
}: {
  shellMode?: boolean;
  query?: string;
  tabActive?: boolean;
} = {}) {
  const { session, loading: authLoading, offline } = useNotesAuth();

  if (!session && authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-[12px] text-[var(--muted)]">
        Signing in…
      </div>
    );
  }

  if (!session) {
    return <CookieSyncSignIn shellMode={shellMode} />;
  }

  return <CookieSyncMain session={session} shellMode={shellMode} tabActive={tabActive} />;
}
