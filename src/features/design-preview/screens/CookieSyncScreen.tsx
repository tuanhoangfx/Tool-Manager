import { useCallback, useEffect, useState } from "react";
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
import { CheckCircle2, Link2, Radio, RefreshCw, Zap } from "lucide-react";
import { AppSettingsButton } from "../../../components/AppSettingsButton";
import { useAppView } from "../../../hooks/useAppView";
import { CookieSettings } from "../../cookie/CookieSettings";
import { CookieBindingEditor } from "../../cookie/CookieBindingEditor";
import { StorageRecommendations } from "../../cookie/StorageRecommendations";
import { CookieAutoSyncTable } from "../../cookie/CookieAutoSyncTable";
import { CookieQuickConnect } from "../../cookie/CookieQuickConnect";
import { hasCookieDeepLink, readCookieDeepLink } from "../../cookie/cookieDeepLink";
import { useCookieBindings } from "../../cookie/useCookieBindings";
import { useCookieVaultMap } from "../../cookie/useCookieVaultMap";
import { useNotesCookieRealtime } from "../../cookie/useNotesCookieRealtime";
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
  query = "",
}: {
  session: Session;
  shellMode?: boolean;
  query?: string;
}) {
  const { isSettings, setView } = useAppView();
  const { notes, loading, error, refresh } = useNotes(session);
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
    setTimeout(() => void refresh(), 2500);
  };

  const onSaveBindings = () => {
    pushToExtension();
    const n = bindings.filter((b) => b.enabled).length;
    pushToast(`Đã push ${n} binding(s) tới extension.`, "success");
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

  const q = query.trim().toLowerCase();
  const filteredBindings = q
    ? bindings.filter(
        (b) =>
          b.domain.toLowerCase().includes(q) ||
          b.syncId.toLowerCase().includes(q) ||
          (b.noteTitle ?? "").toLowerCase().includes(q),
      )
    : bindings;

  const headerActions = (
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
  );

  return (
    <div className={shellMode ? "" : "p-6"}>
      {!shellMode ? (
        <PageHeader
          title="Cookie sync"
          desc={`Domain → note binding · vault · extension v${EXTENSION_BUILD.version} (${EXTENSION_BUILD.updated})`}
          actions={headerActions}
        />
      ) : (
        <div className="mb-4 flex flex-wrap justify-end gap-2">{headerActions}</div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-emerald-100">E0001-cookie-bridge</div>
          <div className="text-[11px] text-[var(--muted)]">
            <code className="text-indigo-300">E:\Dev\Extension\E0001-cookie-bridge</code>
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
          bindings={filteredBindings}
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

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <CookieBindingEditor
          bindings={filteredBindings}
          notes={notes}
          onAdd={(noteId, domain, pass) => addBinding(noteId, domain, pass)}
          onUpdate={updateBinding}
          onRemove={removeBinding}
          onPushExtension={onSaveBindings}
        />
        <StorageRecommendations />
      </div>

    </div>
  );
}

export function CookieSyncScreen({
  shellMode,
  query,
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

  return <CookieSyncMain session={session} shellMode={shellMode} query={query} />;
}
