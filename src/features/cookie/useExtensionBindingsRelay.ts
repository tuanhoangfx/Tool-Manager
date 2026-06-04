import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  loadCookieBindings,
  loadSelectedBindingId,
} from "./cookieBridge";
import { getHubIdentitySession } from "../../lib/supabase-identity";
import {
  broadcastExtensionAuth,
  broadcastExtensionIdentityAuth,
  broadcastSelectedBinding,
} from "./extensionBridgeMessages";

/**
 * When the extension asks for session (User modal → Refresh), re-push Tool sessions only.
 * Extension pulls route list from Supabase; relay must not trigger vault apply or bulk cookie sync.
 */
export function useExtensionBindingsRelay(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const handler = async (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "P0020_REQUEST_BINDINGS_FROM_EXTENSION") return;

      const hubSession = await getHubIdentitySession();
      if (hubSession) {
        broadcastExtensionIdentityAuth({
          access_token: hubSession.access_token,
          refresh_token: hubSession.refresh_token,
          expires_at: hubSession.expires_at,
          user: hubSession.user,
        });
      }
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (s) {
        broadcastExtensionAuth({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          expires_at: s.expires_at,
          user: s.user,
        });
      }

      const list = loadCookieBindings();
      const selId = loadSelectedBindingId();
      const sel = selId ? list.find((b) => b.id === selId) : list.find((b) => b.enabled);
      broadcastSelectedBinding(sel?.noteId ?? null);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [active]);
}
