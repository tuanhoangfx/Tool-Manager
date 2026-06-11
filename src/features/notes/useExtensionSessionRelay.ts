import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { subscribeHubIdentity } from "../../lib/hub-identity-session";
import { relayActiveSessionsToExtension } from "../../lib/relay-extension-sessions";
import { getOfflineMode } from "../../lib/offlineMode";

const RELAY_MS = 30 * 60 * 1000;

/** Keep E0001 in sync with Tool Hub + Data Box sessions while any workspace tab is open. */
export function useExtensionSessionRelay(session: Session | null) {
  useEffect(() => {
    if (!session || getOfflineMode()) return;

    const push = () => void relayActiveSessionsToExtension();

    push();
    const intervalId = window.setInterval(push, RELAY_MS);
    const unsubHubIdentity = subscribeHubIdentity(() => push());

    return () => {
      window.clearInterval(intervalId);
      unsubHubIdentity();
    };
  }, [session?.access_token, session?.user?.id]);
}
