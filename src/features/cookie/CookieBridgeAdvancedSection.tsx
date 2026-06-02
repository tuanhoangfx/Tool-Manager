import { Key, RefreshCw, ShieldAlert } from "lucide-react";
import { Section, SectionIcon } from "@tool-workspace/hub-ui";
import { compactIconSize } from "../../lib/ui-scale";

/** Snapshot masking & sync-pass hints — separated from Bridge controls. */
export function CookieBridgeAdvancedSection() {
  return (
    <Section icon={<SectionIcon icon={ShieldAlert} className="text-sky-300" />} label="Advanced">
      <p className="text-[10px] leading-relaxed text-[var(--muted)]">
        <span className="font-medium text-[var(--text)]/80">Snapshot values:</span> masked in DB (extension) —
        name = abcd…wxyz only
      </p>
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-2 text-[10px] text-indigo-200/90">
        <Key size={compactIconSize(12)} className="mt-0.5 shrink-0" />
        <span>
          <span className="font-medium text-[var(--text)]/80">Sync pass:</span> set per note on Notes → Sync
          credentials. Required before vault load on reader profiles.
        </span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
        <RefreshCw size={10} className="shrink-0 text-indigo-300/80" aria-hidden />
        Bridge prefs broadcast to E0001-cookie-bridge on save; extension may still need a manual reload after
        manifest updates.
      </p>
    </Section>
  );
}
