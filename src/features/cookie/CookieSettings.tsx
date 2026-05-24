import { useEffect, useState } from "react";

import { Cookie, Key, Shield } from "lucide-react";

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
import { StorageRecommendations } from "./StorageRecommendations";

type Props = {
  onBack: () => void;
  onPrefsChange?: (prefs: CookieBridgePrefs) => void;
};

export function CookieSettings({ onBack, onPrefsChange }: Props) {
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

  return (
    <div className="anim-fade">
      <AppSettingsBack appLabel="Cookie Auto" onBack={onBack} />
      <PageHeader title="Settings" desc="Extension bridge interval, vault V4, optional profile label, and realtime UI." />

      <div className="space-y-4">
        <Glass tone="amber" label="Extension bridge" icon={<Cookie size={12} />}>
          <SettingRow label="P0020-cookie-bridge" desc="Chrome MV3 · E:\Dev\Extension\P0020-cookie-bridge">
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
          <SettingRow
            label="Realtime UI refresh"
            desc="Extension: vault User/count/time qua Realtime + poll 10s (bật để browser 2 thấy sync browser 1)"
          >
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
            desc="AES-GCM jar on sync · requires pass on binding · see docs/SUPABASE-P0020.md"
          >
            <label className="flex items-center gap-2 text-[12px]">
              <input type="checkbox" checked={vaultSync} onChange={(e) => persist({ vaultSync: e.target.checked })} />
              {vaultSync ? "On" : "Off"}
            </label>
          </SettingRow>
          <SettingRow
            label="Realtime apply vault"
            desc="Browser khác Sync → tự Load cookies vào jar (không cần bấm Load — opt-in)"
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
            <strong>Sync now</strong> = upload vault (thủ công). Cookie đổi / F5 chỉ cập nhật snapshot — không ghi đè vault.
            <strong> Load cookies</strong> trên browser khác; bật <strong>Realtime apply vault</strong> để tự Load khi có vault mới.
          </p>
        </Glass>

        <StorageRecommendations />
      </div>
    </div>
  );
}
