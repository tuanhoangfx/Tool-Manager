import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "../../components/toast";
import type { Session } from "@supabase/supabase-js";
import { useNotesAuth } from "../notes/useNotesAuth";
import { useNotes } from "../notes/useNotes";
import {
  broadcastCookieSyncNow,
  broadcastExtensionAuth,
  broadcastCookieBridgePrefs,
  broadcastSelectedBinding,
} from "./cookieBridgeProtocol";
import {
  loadCookieBridgePrefs,
  loadSelectedBindingId,
  saveCookieBridgePrefs,
  saveSelectedBindingId,
} from "./cookieBridge";
import { useExtensionAuthHeartbeat } from "../notes/useExtensionAuthHeartbeat";
import { supabase } from "../../lib/supabase";
import { CheckCircle2, Link2, Radio, RefreshCw, Zap } from "lucide-react";
import { AppSettingsButton } from "../../components/AppSettingsButton";
import { useAppView } from "../../hooks/useAppView";
import { CookieSettings } from "./CookieSettings";
import { CookieAutoSyncTable } from "./CookieAutoSyncTable";
import { CookieQuickConnect } from "./CookieQuickConnect";
import { hasCookieDeepLink, readCookieDeepLink } from "./cookieDeepLink";
import { useCookieBindings } from "./useCookieBindings";
import { useCookieVaultMap } from "./useCookieVaultMap";
import { useNotesCookieRealtime } from "./useNotesCookieRealtime";
import { NotesAuthGate } from "../notes/NotesAuthGate";
import { SupabaseMigrateBanner } from "./SupabaseMigrateBanner";
import { useCookieSchemaHealth } from "./useCookieSchemaHealth";
import { EXTENSION_BUILD } from "./extensionBuildInfo";
import { PageHeader } from "../design-preview/screens/PageHeader";

function CookieSyncSignIn() {
  return (
    <div className="p-6">
      <PageHeader
        title="Cookie sync"
        desc="Sign in to link domains → notes and push config to P0020-cookie-bridge."
      />
      <NotesAuthGate />
    </div>
  );
}

function CookieSyncMain({ session }: { session: Session }) {
  const { isSettings, setView } = useAppView();
  const { notes, loading, refresh } = useNotes(session);
  const { bindings, addBinding, connectAndPush, updateBinding, removeBinding, pushToExtension } =
    useCookieBindings(notes);
  const { vaultByKey, vaultError, refreshVault } = useCookieVaultMap(session, bindings);
  const { health: schemaHealth, refresh: refreshSchemaHealth } = useCookieSchemaHealth(true);
  const { pushToast } = useAppToast();
  const [deepLinkDone, setDeepLinkDone] = useState(false);
  const [realtimeOn, setRealtimeOn] = useState(() => loadCookieBridgePrefs().realtimeSync);
  const [bridgeRole, setBridgeRole] = useState(() => loadCookieBridgePrefs().bridgeRole);
  const [lastRealtimeAt, setLastRealtimeAt] = useState<string | null>(null);
  const [selectedBindingId, setSelectedBindingId] = useState<string | null>(() => loadSelectedBindingId());
  const syncRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setLastRealtimeAt(new Date().toISOString());
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

  useEffect(
    () => () => {
      if (syncRefreshTimer.current) clearTimeout(syncRefreshTimer.current);
    },
    [],
  );

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
    pushToast("Đã gửi session + bindings tới extension (Reload P0020 nếu cần).", "success");
  }, [pushToExtension, pushToast]);

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

  const schedulePostSyncRefresh = useCallback(() => {
    if (syncRefreshTimer.current) clearTimeout(syncRefreshTimer.current);
    syncRefreshTimer.current = setTimeout(() => {
      syncRefreshTimer.current = null;
      void refresh();
      void refreshVault();
    }, 2500);
  }, [refresh, refreshVault]);

  const onSyncNow = (noteId?: string) => {
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
    schedulePostSyncRefresh();
  };

  const toggleRealtime = (on: boolean) => {
    setRealtimeOn(on);
    const prefs = { ...loadCookieBridgePrefs(), realtimeSync: on };
    saveCookieBridgePrefs(prefs);
    broadcastCookieBridgePrefs(prefs);
  };

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

  return (
    <div className="p-6">
      <PageHeader
        title="Cookie sync"
        desc={`Domain → note binding · vault · extension v${EXTENSION_BUILD.version} (${EXTENSION_BUILD.updated})`}
        actions={
          <>
            <AppSettingsButton active={false} onClick={() => setView("settings")} />
            <button type="button" className="btn-ghost btn text-[12px]" onClick={() => void onLinkExtension()}>
              <Link2 size={14} />
              Link extension
            </button>
            <button type="button" className="btn text-[12px]" onClick={() => onSyncNow()}>
              <RefreshCw size={14} />
              Sync now
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-emerald-100">P0020-cookie-bridge</div>
          <div className="text-[11px] text-[var(--muted)]">
            <code className="text-indigo-300">E:\Dev\Extension\P0020-cookie-bridge</code>
            · Nhãn:{" "}
            <span className="text-indigo-300/90">{bridgeRole === "reader" ? "Reader" : "Writer"}</span>
            (tạm, không khóa quyền) · Sync/Load đều được trên mọi browser
          </div>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-[var(--muted)]">
          <input type="checkbox" checked={realtimeOn} onChange={(e) => toggleRealtime(e.target.checked)} />
          <Radio size={12} className={realtimeOn ? "text-emerald-400" : "opacity-40"} />
          Realtime UI
        </label>
        {lastRealtimeAt ? (
          <span className="text-[10px] text-emerald-300/80">
            <Zap size={10} className="mr-1 inline" />
            {new Date(lastRealtimeAt).toLocaleTimeString()}
          </span>
        ) : null}
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

      <div className="mb-4">
        <CookieQuickConnect
          notes={notes}
          onConnect={async (opts) => {
            const res = await connectAndPush(opts);
            if (res.ok) {
              void onLinkExtension();
              void refresh();
            }
            return res.ok ? { ok: true } : { ok: false, error: res.error };
          }}
        />
      </div>

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
          onRefresh={() => {
            void refresh();
            void refreshVault();
          }}
        />
      </div>
    </div>
  );
}

export function CookieSyncScreen() {
  const { session, loading: authLoading } = useNotesAuth();

  if (authLoading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-white/10 bg-white/[.03] p-6 text-sm text-[var(--text)]">
          Loading session…
        </div>
      </div>
    );
  }

  if (!session) {
    return <CookieSyncSignIn />;
  }

  return <CookieSyncMain session={session} />;
}
