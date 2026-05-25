import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppToast } from "../../../components/toast";
import type { Session } from "@supabase/supabase-js";
import { useNotesAuth } from "../../notes/useNotesAuth";
import { useNotes } from "../../notes/useNotes";
import {
  broadcastCookieSyncNow,
  broadcastExtensionAuth,
  broadcastCookieBridgePrefs,
  broadcastSelectedBinding,
} from "../../notes/shareUtils";
import {
  loadCookieBridgePrefs,
  loadSelectedBindingId,
  saveCookieBridgePrefs,
  saveSelectedBindingId,
} from "../../cookie/cookieBridge";
import { useExtensionAuthHeartbeat } from "../../notes/useExtensionAuthHeartbeat";
import { supabase } from "../../../lib/supabase";
import { CheckCircle2, CloudDownload, CloudUpload, Link2, RefreshCw, Settings } from "lucide-react";
import { useAppView } from "../../../hooks/useAppView";
import { CookieSettings } from "../../cookie/CookieSettings";
import { CookieAutoSyncTable } from "../../cookie/CookieAutoSyncTable";
import { CookieBrowserAgents } from "../../cookie/CookieBrowserAgents";
import { hasCookieDeepLink, readCookieDeepLink } from "../../cookie/cookieDeepLink";
import { useCookieBindings } from "../../cookie/useCookieBindings";
import { useCookieVaultMap } from "../../cookie/useCookieVaultMap";
import { useNotesCookieRealtime } from "../../cookie/useNotesCookieRealtime";
import { loadCookieBindings } from "../../cookie/cookieBridge";
import { pullCookieRoutesFromCloud, pushCookieRoutesToCloud, setCookieRouteSource } from "../../cookie/cookieCloudRoutes";
import { useCookieAgents } from "../../cookie/cookieAgents";
import { NotesAuthGate } from "../../notes/NotesAuthGate";
import { Glass } from "../../../theme/p0008";
import { SupabaseMigrateBanner } from "../../cookie/SupabaseMigrateBanner";
import { useCookieSchemaHealth } from "../../cookie/useCookieSchemaHealth";
import { isMissingSyncIdColumn } from "../../notes/notesSelect";
import { EXTENSION_BUILD } from "../../cookie/extensionBuildInfo";
import { PageHeader } from "./PageHeader";

function CookieSyncSignIn({ shellMode }: { shellMode?: boolean }) {
  return (
    <div className={shellMode ? "" : "p-6"}>
      {!shellMode ? (
        <PageHeader
          title="Cookie sync"
          desc="Sign in to link domains → notes and push config to E0001-cookie-bridge."
        />
      ) : null}
      <NotesAuthGate />
    </div>
  );
}

function CookieSyncMain({
  session,
  shellMode,
}: {
  session: Session;
  shellMode?: boolean;
}) {
  const { isSettings, setView } = useAppView();
  const { notes, loading, error, refresh } = useNotes(session);
  const { bindings, setBindings, addBinding, connectAndPush, updateBinding, removeBinding, pushToExtension } =
    useCookieBindings(notes);
  const { vaultByKey, vaultError, refreshVault } = useCookieVaultMap(session, bindings);
  const {
    agents,
    commands: agentCommands,
    loading: agentsLoading,
    error: agentsError,
    refresh: refreshAgents,
    sendCommand: sendAgentCommand,
  } = useCookieAgents(session);
  const { health: schemaHealth, refresh: refreshSchemaHealth } = useCookieSchemaHealth(true);
  const { pushToast } = useAppToast();
  const [deepLinkDone, setDeepLinkDone] = useState(false);
  const [realtimeOn, setRealtimeOn] = useState(() => loadCookieBridgePrefs().realtimeSync);
  const [bridgeRole, setBridgeRole] = useState(() => loadCookieBridgePrefs().bridgeRole);
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(() => loadSelectedBindingId());
  const [cloudBusy, setCloudBusy] = useState<"push" | "pull" | null>(null);
  const [cloudSyncedAt, setCloudSyncedAt] = useState<string | null>(null);
  const [autoRan, setAutoRan] = useState(false);

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

  const onRealtimeRefresh = useCallback(() => {
    void refresh();
    void refreshVault();
  }, [refresh, refreshVault]);

  useNotesCookieRealtime(session, onRealtimeRefresh, realtimeOn);

  useEffect(() => {
    const prefs = loadCookieBridgePrefs();
    setBridgeRole(prefs.bridgeRole);
    broadcastCookieBridgePrefs(prefs);
  }, []);

  useExtensionAuthHeartbeat(session);


  const onLinkExtension = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    if (!s) {
      pushToast("Chưa đăng nhập.", "warn");
      return;
    }
    broadcastExtensionAuth({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
      user: s.user,
    });
    pushToExtension();
    pushToast("Đã gửi session + bindings tới extension (Reload E0001 nếu cần).", "success");
  }, [pushToExtension, pushToast]);

  const onPushCloudRoutes = useCallback(async () => {
    setCloudBusy("push");
    const res = await pushCookieRoutesToCloud(session, bindings);
    setCloudBusy(null);
    if (!res.ok) {
      pushToast(res.error, "error", 8000);
      return;
    }
    setCloudSyncedAt(new Date().toISOString());
    pushToast(`Pushed ${res.count} route(s) to cloud.`, "success");
  }, [bindings, pushToast, session]);

  const onPullCloudRoutes = useCallback(async () => {
    setCloudBusy("pull");
    const res = await pullCookieRoutesFromCloud(session, bindings, notes);
    setCloudBusy(null);
    if (!res.ok) {
      pushToast(res.error, "error", 8000);
      return;
    }
    setBindings(res.bindings);
    pushToExtension(res.bindings);
    setCloudSyncedAt(new Date().toISOString());
    pushToast(
      res.count ? `Pulled ${res.count} cloud route(s) and pushed extension.` : "No cloud routes found.",
      res.count ? "success" : "warn",
    );
  }, [bindings, notes, pushToExtension, pushToast, session, setBindings]);

  useEffect(() => {
    if (deepLinkDone || loading) return;
    const link = readCookieDeepLink();
    if (!hasCookieDeepLink(link)) return;
    if (!notes.length && !link.syncId && !link.noteId) return;

    void connectAndPush({
      noteId: link.noteId ?? undefined,
      syncId: link.syncId ?? undefined,
      domain: link.domain!,
      pass: link.pass ?? undefined,
    }).then((res) => {
      setDeepLinkDone(true);
      if (res.ok) {
        pushToast("Đã load binding từ URL và push extension.", "success");
        void onLinkExtension();
      } else {
        pushToast(res.error, "error");
      }
    });
  }, [notes, loading, deepLinkDone, connectAndPush, onLinkExtension, pushToast]);

  const onSyncNow = useCallback((noteId?: string) => {
    const row = bindings.find((b) => b.id === selectedBindingId);
    const targetNoteId = noteId ?? row?.noteId;
    broadcastCookieSyncNow(targetNoteId);
    if (targetNoteId) {
      pushToast(
        `Đã gửi Sync tới extension — ${row?.noteTitle ?? "route đã chọn"}. Mở popup extension → Sync now / Load cookies.`,
        "info",
      );
    } else {
      pushToast("Chọn route trong bảng trước khi Sync.", "warn");
    }
    setTimeout(() => void refresh(), 2500);
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
      if (actions.has("pull-cloud")) await onPullCloudRoutes();
      if (actions.has("push-cloud")) await onPushCloudRoutes();
      if (actions.has("sync")) window.setTimeout(() => onSyncNow(), 1200);
    })();
  }, [autoRan, loading, onLinkExtension, onPullCloudRoutes, onPushCloudRoutes, onSyncNow]);

  if (isSettings) {
    return (
      <CookieSettings
        onBack={() => setView("main")}
        onPrefsChange={(p) => {
          setBridgeRole(p.bridgeRole);
          broadcastCookieBridgePrefs(p);
        }}
      />
    );
  }

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
      pushToast("Chọn route trước khi đặt source.", "warn");
      return;
    }
    if (!agent.facebook_has_login) {
      pushToast("Browser này chưa có Facebook login cookie, không thể làm source.", "warn");
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
    setCloudSyncedAt(new Date().toISOString());
    pushToast(`Locked source: ${agent.label || agent.browser_id.slice(0, 8)}. Targets are read-only.`, "success");
  };

  const headerActions = useMemo(() => (
    <>
      <button
        type="button"
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5"
        onClick={() => setView("settings")}
      >
        <Settings size={12} />
        Settings
      </button>
      <button
        type="button"
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5"
        onClick={() => void onLinkExtension()}
      >
        <Link2 size={14} />
        Link extension
      </button>
      <button
        type="button"
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5 disabled:opacity-50"
        disabled={cloudBusy != null}
        onClick={() => void onPullCloudRoutes()}
      >
        <CloudDownload size={14} />
        {cloudBusy === "pull" ? "Pulling…" : "Pull routes"}
      </button>
      <button
        type="button"
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-white/10 bg-[var(--panel-2)] px-3 text-xs text-[var(--text)] hover:bg-white/5 disabled:opacity-50"
        disabled={cloudBusy != null}
        onClick={() => void onPushCloudRoutes()}
      >
        <CloudUpload size={14} />
        {cloudBusy === "push" ? "Pushing…" : "Push cloud"}
      </button>
      <button
        type="button"
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/20 px-3 text-xs font-medium text-indigo-100 hover:bg-indigo-500/30"
        onClick={() => onSyncNow()}
      >
        <RefreshCw size={14} />
        Sync now
      </button>
    </>
  ), [cloudBusy, onLinkExtension, onPullCloudRoutes, onPushCloudRoutes, onSyncNow, setView]);

  return (
    <div className={shellMode ? "" : "p-6"}>
      {!shellMode ? (
        <PageHeader
          title="Cookie sync"
          desc={`Domain → note binding · vault · extension v${EXTENSION_BUILD.version} (${EXTENSION_BUILD.updated})`}
          actions={headerActions}
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
            if (row) setSelectedBindingId(row.id);
          }}
          onUpdate={updateBinding}
          onRemove={(id) => {
            removeBinding(id);
            if (selectedBindingId === id) setSelectedBindingId(null);
          }}
          onSyncRoute={(b) => onSyncNow(b.noteId)}
          onPushExtension={pushToExtension}
          vaultByKey={vaultByKey}
          vaultError={vaultError}
          toolbarActions={shellMode ? headerActions : null}
          renderDetail={(binding) => (
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
            void refreshVault();
          }}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-emerald-100">E0001-cookie-bridge</div>
          <div className="text-[11px] text-[var(--muted)]">
            <code className="text-indigo-300">E:\Dev\Extension\E0001-cookie-bridge</code>
            · Nhãn:{" "}
            <span className="text-indigo-300/90">{bridgeRole === "reader" ? "Reader" : "Writer"}</span>
            · Source lock active: chỉ browser được chọn mới Publish/Sync vault
          </div>
          <div className="mt-1 text-[10px] text-emerald-300/80">
            Routes cloud sync: {cloudSyncedAt ? `synced ${new Date(cloudSyncedAt).toLocaleTimeString()}` : "ready"}
            <span className="text-[var(--muted)]"> · sync pass stays local per browser</span>
          </div>
        </div>
      </div>

      <SupabaseMigrateBanner
        health={schemaHealth}
        onRecheck={() => {
          void refreshSchemaHealth().then((h) => {
            if (h?.ok) pushToast("Schema cookie bridge: 4/4 OK", "success");
            else pushToast("Schema vẫn thiếu — xem checklist bên dưới.", "warn", 8000);
          });
        }}
      />

    </div>
  );
}

export function CookieSyncScreen({
  shellMode,
}: {
  shellMode?: boolean;
  query?: string;
} = {}) {
  const { session, loading: authLoading } = useNotesAuth();

  if (authLoading) {
    return (
      <div className={shellMode ? "" : "p-6"}>
        <div className="rounded-xl border border-white/10 bg-white/[.03] p-6 text-sm text-[var(--text)]">
          Loading session…
        </div>
      </div>
    );
  }

  if (!session) {
    return <CookieSyncSignIn shellMode={shellMode} />;
  }

  return <CookieSyncMain session={session} shellMode={shellMode} />;
}
