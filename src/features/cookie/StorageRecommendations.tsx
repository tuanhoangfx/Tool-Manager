import { Database, HardDrive, Shield } from "lucide-react";
import { Glass } from "../../theme/p0008";

const LAYERS = [
  {
    icon: HardDrive,
    title: "Extension local (bindings)",
    desc: "syncId + domain + optional pass in chrome.storage.local. Best for routing which site maps to which note — not for cookie values.",
    tone: "amber" as const,
  },
  {
    icon: Database,
    title: "Supabase notes.cookie_snapshot (jsonb)",
    desc: "Masked lines only (name = abcd…wxyz). Updated via RPC note_sync_cookies — no user JWT required when sync pass is set.",
    tone: "indigo" as const,
  },
  {
    icon: Shield,
    title: "Optional sync pass (notes.sync_pass_hash)",
    desc: "bcrypt via note_set_sync_pass. Extension must send pass on each push; values never stored in plaintext in DB.",
    tone: "emerald" as const,
  },
];

export function StorageRecommendations() {
  return (
    <Glass tone="slate" label="Storage model (recommended)">
      <ul className="space-y-3">
        {LAYERS.map(({ icon: Icon, title, desc, tone }) => (
          <li key={title} className="flex gap-3 text-[12px]">
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                tone === "amber"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  : tone === "indigo"
                    ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              <Icon size={14} />
            </span>
            <div>
              <div className="font-medium text-[var(--text)]">{title}</div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-white/10 pt-3 text-[10px] text-[var(--muted)]">
        Realtime: enable Replication on <code className="text-indigo-300">public.notes</code> in Supabase → UI refreshes when
        extension writes cookie_snapshot. Do not store full cookie values in note body_md.
      </p>
    </Glass>
  );
}
