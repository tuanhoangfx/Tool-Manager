import { useEffect, useState } from "react";

import { Cookie, Key, Shield, X } from "lucide-react";

import { AppSettingsBack } from "../../components/AppSettingsBack";

import { SettingRow } from "../../components/SettingRow";

import { Glass } from "../../theme/p0008";

import { PageHeader } from "../design-preview/screens/PageHeader";

import {
  loadCookieBridgePrefs,
  saveCookieBridgePrefs,
  type CookieBridgePrefs,
  type CookieBridgeRole,
} from "./cookieBridge";

import { EXTENSION_BUILD } from "./extensionBuildInfo";

type Props = {
  onBack: () => void;
  onPrefsChange?: (prefs: CookieBridgePrefs) => void;
  variant?: "page" | "modal";
};

export function CookieSettings({ onBack, onPrefsChange, variant = "page" }: Props) {
  const [intervalMin, setIntervalMin] = useState(60);
  const [realtimeSync, setRealtimeSync] = useState(true);
  const [vaultSync, setVaultSync] = useState(true);
  const [realtimeVaultApply, setRealtimeVaultApply] = useState(false);
  const [bridgeRole, setBridgeRole] = useState<CookieBridgeRole>("writer");

  useEffect(() => {
    const p = loadCookieBridgePrefs();
    setIntervalMin(p.syncIntervalMinutes);
    setRealtimeSync(p.realtimeSync);
    setVaultSync(p.vaultSync);
    setRealtimeVaultApply(p.realtimeVaultApply);
    setBridgeRole(p.bridgeRole);
  }, []);

  const persist = (patch: Partial<CookieBridgePrefs>) => {
    const next: CookieBridgePrefs = {
      syncIntervalMinutes: intervalMin,
      realtimeSync,
      vaultSync,
      realtimeVaultApply,
      bridgeRole,
      ...patch,
    };
    saveCookieBridgePrefs(next);
    if (patch.syncIntervalMinutes != null) setIntervalMin(patch.syncIntervalMinutes);
    if (patch.realtimeSync != null) setRealtimeSync(patch.realtimeSync);
    if (patch.vaultSync != null) setVaultSync(patch.vaultSync);
    if (patch.realtimeVaultApply != null) setRealtimeVaultApply(patch.realtimeVaultApply);
    if (patch.bridgeRole != null) setBridgeRole(patch.bridgeRole);
    onPrefsChange?.(next);
  };

  const content = (
    <div className={variant === "modal" ? "space-y-3" : "space-y-4"}>
        <Glass tone="amber" label="Extension bridge" icon={<Cookie size={12} />}>
          <SettingRow label="E0001-cookie-bridge" desc="Chrome MV3 · E:\Dev\Extension\E0001-cookie-bridge">
            <span className="badge border border-emerald-500/40 bg-emerald-500/20 text-emerald-200">
              v{EXTENSION_BUILD.version}
            </span>
          </SettingRow>
          <SettingRow
            label="Profile label (tạm)"
            desc="Chưa phân quyền — mọi browser đều Sync + Load. Sync = đẩy jar lên Supabase (bản mới nhất); Load = lấy vault mới nhất."
          >
            <select
              className="field w-36 text-[12px]"
              value={bridgeRole}
              onChange={(e) => {
                const role = e.target.value === "reader" ? "reader" : "writer";
                persist({ bridgeRole: role });
              }}
            >
              <option value="writer">Writer</option>
              <option value="reader">Reader</option>
            </select>
          </SettingRow>
          <SettingRow label="Sync interval" desc="chrome.alarms period (extension)">
            <select
              className="field w-32 text-[12px]"
              value={intervalMin}
              onChange={(e) => persist({ syncIntervalMinutes: Number(e.target.value) })}
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
              <option value={120}>2 hours</option>
            </select>
          </SettingRow>
          <SettingRow label="Realtime UI refresh" desc="Supabase postgres_changes on notes + vault">
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={realtimeSync}
                onChange={(e) => persist({ realtimeSync: e.target.checked })}
              />
              {realtimeSync ? "On" : "Off"}
            </label>
          </SettingRow>
          <SettingRow label="Snapshot values" desc="Masked in DB (extension)">
            <span className="text-[11px] text-[var(--muted)]">name = abcd…wxyz only</span>
          </SettingRow>
          <SettingRow label="Sync pass" desc="Set on each note in Notes → Sync credentials">
            <button type="button" className="btn-ghost btn text-[12px]" disabled title="Edit on Notes screen">
              <Key size={12} />
              Per-note on Notes
            </button>
          </SettingRow>
        </Glass>

        <Glass tone="violet" label="V4 — Encrypted vault" icon={<Shield size={12} />}>
          <SettingRow
            label="Upload encrypted vault"
            desc="AES-GCM jar on sync · requires pass on binding · run APPLY_VAULT_V4.sql"
          >
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={vaultSync} onChange={(e) => persist({ vaultSync: e.target.checked })} />
              {vaultSync ? "On" : "Off"}
            </label>
          </SettingRow>
          <SettingRow
            label="Realtime apply vault"
            desc="Other browser pushes → this browser chrome.cookies.set (opt-in)"
          >
            <label className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={realtimeVaultApply}
                onChange={(e) => persist({ realtimeVaultApply: e.target.checked })}
              />
              {realtimeVaultApply ? "On" : "Off"}
            </label>
          </SettingRow>
          <p className="text-[11px] text-amber-200/80 leading-relaxed px-1">
            Cross-browser: Link extension mỗi Chrome profile. <strong>Sync now</strong> chỉ bật cho owner route;
            nếu đã khóa Source thì chỉ source browser được publish. <strong>Load cookies</strong> trên browser khác
            lấy vault mới nhất từ Supabase.
          </p>
        </Glass>
    </div>
  );

  if (variant === "modal") {
    return (
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg)] shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
              <Cookie size={15} className="text-amber-300" />
              Cookie settings
            </div>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              Extension bridge, vault V4 and realtime UI preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.03] text-[var(--muted)] hover:bg-white/[.06] hover:text-[var(--text)]"
            aria-label="Close settings"
            title="Close settings"
          >
            <X size={15} />
          </button>
        </div>
        <div className="max-h-[min(76vh,42rem)] overflow-y-auto p-4">{content}</div>
      </div>
    );
  }

  return (
    <div className="anim-fade">
      <AppSettingsBack appLabel="Cookie Auto" onBack={onBack} />
      <PageHeader title="Settings" desc="Extension bridge interval, vault V4, optional profile label, and realtime UI." />
      {content}
    </div>
  );
}
