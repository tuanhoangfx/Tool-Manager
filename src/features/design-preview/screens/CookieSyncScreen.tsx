import { useState } from "react";
import { useNotesAuth } from "../../notes/useNotesAuth";
import { useNotes } from "../../notes/useNotes";
import { broadcastExtensionAuth } from "../../notes/shareUtils";
import { supabase } from "../../../lib/supabase";
import { AlertCircle, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { Glass, StatusBadge } from "../../../theme/p0008";
import { PageHeader } from "./PageHeader";

export function CookieSyncScreen() {
  const { session, loading: authLoading } = useNotesAuth();
  const { notes, loading, error, refresh } = useNotes(session);
  const [bridgeHint, setBridgeHint] = useState("");
  const [syncHint, setSyncHint] = useState("");

  const onLinkExtension = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) {
      setBridgeHint("Chưa đăng nhập.");
      return;
    }
    broadcastExtensionAuth({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at,
    });
    setBridgeHint("Đã gửi phiên tới extension. Cài P0020-cookie-bridge (Load unpacked) nếu chưa có.");
  };

  const onSyncNow = () => {
    window.postMessage({ type: "P0020_COOKIE_BRIDGE_SYNC" }, window.location.origin);
    setSyncHint("Đã yêu cầu sync — xem popup extension sau vài giây.");
    setTimeout(() => void refresh(), 3000);
  };

  if (authLoading) {
    return <div className="anim-fade p-6 text-sm text-[var(--muted)]">Đang tải…</div>;
  }

  if (!session) {
    return (
      <div className="anim-fade p-6 text-sm text-[var(--muted)]">
        Đăng nhập tại màn Notes để xem domain → note từ Supabase.
      </div>
    );
  }

  return (
    <div className="anim-fade">
      <PageHeader
        title="Cookie sync"
        desc="Extension MV3 — hourly sync cookie_snapshot + sync_status."
        actions={
          <>
            <button type="button" className="btn-ghost btn text-[12px]" onClick={() => void onLinkExtension()}>
              <Link2 size={14} />
              Kết nối extension
            </button>
            <button type="button" className="btn text-[12px]" onClick={onSyncNow}>
              <RefreshCw size={14} />
              Sync now
            </button>
          </>
        }
      />

      {bridgeHint ? (
        <p className="mb-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-[12px] text-indigo-200">
          {bridgeHint}
        </p>
      ) : null}
      {syncHint ? (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-200">
          {syncHint}
        </p>
      ) : null}

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <CheckCircle2 size={20} className="text-emerald-400" />
        <div>
          <div className="text-sm font-medium text-emerald-100">P0020-cookie-bridge</div>
          <div className="text-[11px] text-[var(--muted)]">
            <code className="text-indigo-300">E:\Dev\Extension\P0020-cookie-bridge</code> · alarm 60 phút
          </div>
        </div>
      </div>

      {error ? <p className="mb-3 text-[12px] text-rose-300">{error}</p> : null}

      <Glass tone="slate" label="Domain → Note">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase text-[var(--muted)]">
              <th className="pb-2 pr-3">Domain</th>
              <th className="pb-2 pr-3">Note</th>
              <th className="pb-2 pr-3">Lần sync cuối</th>
              <th className="pb-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((n) => (
              <tr key={n.id} className="border-b border-white/5">
                <td className="py-2.5 pr-3 font-mono text-indigo-300/90">{n.domain || "—"}</td>
                <td className="py-2.5 pr-3">{n.title}</td>
                <td className="py-2.5 pr-3 text-[var(--muted)]">{n.syncLabel}</td>
                <td className="py-2.5">
                  <StatusBadge tone={n.syncTone}>{n.syncTone === "emerald" ? "OK" : "Check"}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && notes.length === 0 ? (
          <p className="py-4 text-[11px] text-[var(--muted)]">Chưa có note — thêm domain trong Chỉnh sửa note.</p>
        ) : null}
      </Glass>

      <Glass tone="amber" label="Log sync" className="mt-4">
        <ul className="space-y-2 font-mono text-[10px] text-[var(--muted)]">
          <li className="flex gap-2">
            <span className="text-emerald-400">ext</span> Popup extension → last sync timestamp
            <AlertCircle size={12} className="text-amber-400" />
          </li>
        </ul>
      </Glass>
    </div>
  );
}
