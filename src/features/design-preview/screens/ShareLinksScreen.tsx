import { Copy, ExternalLink, Link2, Trash2 } from "lucide-react";
import { Glass, StatusBadge } from "../../../theme/p0008";
import { PageHeader } from "./PageHeader";

const SHARES = [
  { id: "s1", note: "Zalo OA — Session", url: "…/share/k7xm9a", expires: "29/05/2026", views: 12, active: true },
  { id: "s2", note: "GitHub — API tokens", url: "…/share/gh2k1p", expires: "Hết hạn", views: 4, active: false },
];

export function ShareLinksScreen() {
  return (
    <div className="anim-fade">
      <PageHeader
        title="Share links"
        desc="Link read-only có password — cookie giải mã phía client, không public plaintext."
      />

      <Glass tone="cyan" className="mb-4">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[var(--muted)]">
              <th className="pb-2 pr-3">Note</th>
              <th className="pb-2 pr-3">Link</th>
              <th className="pb-2 pr-3">Hết hạn</th>
              <th className="pb-2 pr-3">Lượt xem</th>
              <th className="pb-2"> </th>
            </tr>
          </thead>
          <tbody>
            {SHARES.map((s) => (
              <tr key={s.id} className="border-b border-white/5">
                <td className="py-2.5 pr-3 font-medium">{s.note}</td>
                <td className="py-2.5 pr-3 font-mono text-indigo-300/90">{s.url}</td>
                <td className="py-2.5 pr-3">
                  <StatusBadge tone={s.active ? "emerald" : "rose"}>{s.expires}</StatusBadge>
                </td>
                <td className="py-2.5 pr-3 tabular-nums">{s.views}</td>
                <td className="py-2.5">
                  <div className="flex gap-1">
                    <button type="button" className="btn-ghost btn !px-2 !py-1" title="Copy">
                      <Copy size={14} />
                    </button>
                    <button type="button" className="btn-ghost btn !px-2 !py-1" title="Open">
                      <ExternalLink size={14} />
                    </button>
                    <button type="button" className="btn-ghost btn !px-2 !py-1 text-rose-300" title="Revoke">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Glass>

      <Glass tone="indigo" label="Trang public share (preview)" icon={<Link2 size={12} />}>
        <div className="mx-auto max-w-md rounded-xl border border-white/10 bg-black/30 p-6 text-center">
          <p className="text-[11px] text-[var(--muted)]">Shared note · read-only</p>
          <h2 className="mt-2 text-lg font-semibold">Zalo OA — Session</h2>
          <input className="field mx-auto mt-4 max-w-xs text-center text-[12px]" placeholder="Nhập password share…" readOnly />
          <button type="button" className="btn mx-auto mt-2 text-[12px]">
            Xem nội dung
          </button>
        </div>
      </Glass>
    </div>
  );
}
