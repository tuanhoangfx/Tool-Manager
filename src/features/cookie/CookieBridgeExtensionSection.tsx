import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Section, SectionIcon, ToggleRow } from "@tool-workspace/hub-ui";
import { broadcastCookieBridgePrefs } from "./extensionBridgeMessages";
import {
  loadCookieBridgePrefs,
  saveCookieBridgePrefs,
  type CookieBridgePrefs,
  type CookieBridgeRole,
} from "./cookieBridge";
import { useExtensionRelease } from "./useExtensionRelease";
import { COOKIE_BRIDGE_PREFS_CHANGE_EVENT } from "./cookie-bridge-prefs-events";

const INTERVAL_OPTIONS = [15, 30, 60, 120, 240] as const;

export function CookieBridgeExtensionSection() {
  const extensionRelease = useExtensionRelease();
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
    <Section icon={<SectionIcon icon={Cookie} className="text-amber-300" />} label="Extension bridge">
      <div className="mb-2 rounded-lg border border-white/10 bg-white/[.03] px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[var(--text)]">E0001-cookie-bridge</span>
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
            v{extensionRelease.version}
          </span>
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
          Chrome MV3 · GitHub Release ZIP → Load unpacked
        </p>
      </div>

      <div className="mb-2">
        <p className="mb-1 text-[10px] font-medium text-[var(--muted)]">Profile label (local)</p>
        <p className="mb-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
          Temporary label — all browsers can Sync + Load until per-route roles apply.
        </p>
        <div className="grid grid-cols-2 gap-1">
          {(["writer", "reader"] as CookieBridgeRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => persist({ bridgeRole: role })}
              className={`rounded-md px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                prefs.bridgeRole === role
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
                  : "bg-white/[.03] text-[var(--muted)] hover:bg-white/[.06] hover:text-[var(--text)]"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <p className="mb-1 text-[10px] font-medium text-[var(--muted)]">Sync interval (minutes)</p>
        <p className="mb-1.5 text-[10px] text-[var(--muted)]">chrome.alarms period in the extension</p>
        <div className="grid grid-cols-5 gap-1">
          {INTERVAL_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => persist({ syncIntervalMinutes: n })}
              className={`rounded-md px-1.5 py-1.5 text-[11px] font-semibold transition-colors ${
                prefs.syncIntervalMinutes === n
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
                  : "bg-white/[.03] text-[var(--muted)] hover:bg-white/[.06] hover:text-[var(--text)]"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <ToggleRow
        label="Realtime UI refresh"
        on={prefs.realtimeSync}
        onChange={() => persist({ realtimeSync: !prefs.realtimeSync })}
      />
      <p className="text-[10px] leading-relaxed text-[var(--muted)]">
        Pull Notes list, open note, and Cookie Auto from Supabase when notes, routes, or vault change on another tab or
        device. Off by default to save egress; tab focus still refreshes Notes quietly.
      </p>
    </Section>
  );
}
