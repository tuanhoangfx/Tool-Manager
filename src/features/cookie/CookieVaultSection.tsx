import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Section, SectionIcon, ToggleRow } from "@tool-workspace/hub-ui";
import { broadcastCookieBridgePrefs } from "./extensionBridgeMessages";
import { loadCookieBridgePrefs, saveCookieBridgePrefs, type CookieBridgePrefs } from "./cookieBridge";
import { COOKIE_BRIDGE_PREFS_CHANGE_EVENT } from "./cookie-bridge-prefs-events";

export function CookieVaultSection() {
  const [prefs, setPrefs] = useState<CookieBridgePrefs>(() => loadCookieBridgePrefs());

  useEffect(() => {
    const sync = () => setPrefs(loadCookieBridgePrefs());
    const onPrefs = (event: Event) => {
      const detail = (event as CustomEvent<CookieBridgePrefs>).detail;
      if (detail) setPrefs(detail);
      else sync();
    };
    window.addEventListener("popstate", sync);
    window.addEventListener(COOKIE_BRIDGE_PREFS_CHANGE_EVENT, onPrefs);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(COOKIE_BRIDGE_PREFS_CHANGE_EVENT, onPrefs);
    };
  }, []);

  const persist = (patch: Partial<CookieBridgePrefs>) => {
    const next = { ...prefs, ...patch };
    saveCookieBridgePrefs(next);
    broadcastCookieBridgePrefs(next);
    setPrefs(next);
  };

  return (
    <Section icon={<SectionIcon icon={Shield} className="text-violet-300" />} label="Encrypted vault (V4)">
      <ToggleRow
        label="Upload encrypted vault"
        on={prefs.vaultSync}
        onChange={() => persist({ vaultSync: !prefs.vaultSync })}
      />
      <p className="mb-2 text-[10px] leading-relaxed text-[var(--muted)]">
        AES-GCM jar on sync · requires pass on binding · run APPLY_VAULT_V4.sql
      </p>
      <ToggleRow
        label="Realtime apply vault"
        on={prefs.realtimeVaultApply}
        onChange={() => persist({ realtimeVaultApply: !prefs.realtimeVaultApply })}
      />
      <p className="mb-2 text-[10px] leading-relaxed text-[var(--muted)]">
        When another browser pushes a vault, this browser applies cookies via chrome.cookies.set (opt-in).
      </p>
      <p className="text-[10px] leading-relaxed text-amber-200/80">
        Cross-browser: link the extension in each Chrome profile. Sync now is enabled for owner routes only; when a
        source browser is locked, only that browser can publish. Load cookies on other browsers pulls the latest
        vault from Supabase.
      </p>
    </Section>
  );
}
