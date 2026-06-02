import { useEffect } from "react";
import { ensureDataBoxAuth } from "../../lib/ensure-data-box-auth";
import { cacheHubIdentity } from "../../lib/hub-identity-session";
import { isToolHubOrigin } from "../../lib/hub-identity-urls";

type HubIdentityMessage = {
  type: "P0004_HUB_IDENTITY_SESSION";
  access_token?: string;
  refresh_token?: string;
  expires_at?: number | null;
  user_id?: string | null;
  user_email?: string | null;
  supabase_url?: string;
  supabase_anon_key?: string;
};

/** Accept `P0004_HUB_IDENTITY_SESSION` from Tool Hub after popup sign-in (`?returnTo=`). */
export function useHubIdentityRelay() {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!isToolHubOrigin(event.origin)) return;
      const data = event.data as HubIdentityMessage | undefined;
      if (data?.type !== "P0004_HUB_IDENTITY_SESSION") return;
      if (!data.access_token || !data.supabase_url || !data.supabase_anon_key) return;

      cacheHubIdentity({
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? "",
        expires_at: data.expires_at ?? null,
        user_id: data.user_id ?? null,
        user_email: data.user_email ?? null,
        supabase_url: data.supabase_url,
        supabase_anon_key: data.supabase_anon_key,
      });
      void ensureDataBoxAuth();
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
}
