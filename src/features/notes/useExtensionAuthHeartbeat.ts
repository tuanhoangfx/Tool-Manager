import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { relayActiveSessionsToExtension } from "../../lib/relay-extension-sessions";

const HEARTBEAT_MS = 30 * 60 * 1000;

/** @deprecated Use useExtensionSessionRelay at workspace shell — kept for Cookie tab import compatibility. */
export function useExtensionAuthHeartbeat(session: Session | null) {
  useEffect(() => {
    if (!session) return;
    const push = () => void relayActiveSessionsToExtension();
    void push();
    const id = window.setInterval(push, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [session]);
}
