import { useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  bindingsForExtension,
  loadCookieBindings,
  loadSelectedBindingId,
} from "./cookieBridge";
import {
  broadcastCookieBindings,
  broadcastExtensionAuth,
  broadcastSelectedBinding,
} from "../notes/shareUtils";

/**
 * When the extension popup asks for routes, re-push bindings + session from Tool localStorage
 * (works on any Manager screen — not only Cookie sync).
 */
export function useExtensionBindingsRelay(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const handler = async (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "P0020_REQUEST_BINDINGS_FROM_EXTENSION") return;

      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (s) {
        broadcastExtensionAuth({
          access_token: s.access_token,
          refresh_token: s.refresh_token,
          expires_at: s.expires_at,
        });
      }

      const list = loadCookieBindings();
      if (!list.length) return;

      broadcastCookieBindings(bindingsForExtension(list));
      const selId = loadSelectedBindingId();
      const sel = selId ? list.find((b) => b.id === selId) : list.find((b) => b.enabled);
      broadcastSelectedBinding(sel?.noteId ?? null);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [active]);
}
