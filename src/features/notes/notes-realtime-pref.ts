import { useEffect, useState } from "react";
import { COOKIE_BRIDGE_PREFS_CHANGE_EVENT } from "../cookie/cookie-bridge-prefs-events";
import { loadCookieBridgePrefs } from "../cookie/cookieBridge";

/** Cookie settings → Realtime UI refresh (Notes list + open note + Cookie Auto). */
export function readNotesRealtimeUiRefresh(): boolean {
  return loadCookieBridgePrefs().realtimeSync;
}

export function useNotesRealtimeUiRefresh(): boolean {
  const [enabled, setEnabled] = useState(readNotesRealtimeUiRefresh);
  useEffect(() => {
    const sync = () => setEnabled(readNotesRealtimeUiRefresh());
    window.addEventListener(COOKIE_BRIDGE_PREFS_CHANGE_EVENT, sync);
    return () => window.removeEventListener(COOKIE_BRIDGE_PREFS_CHANGE_EVENT, sync);
  }, []);
  return enabled;
}
