import type { Session } from "@supabase/supabase-js";
import {
  broadcastExtensionAuth,
  broadcastExtensionIdentityAuth,
} from "../features/cookie/extensionBridgeMessages";
import { getHubIdentitySession } from "./supabase-identity";
import { supabase } from "./supabase";

export function relaySessionsToExtension(identity: Session | null, data: Session | null) {
  if (identity) {
    broadcastExtensionIdentityAuth({
      access_token: identity.access_token,
      refresh_token: identity.refresh_token,
      expires_at: identity.expires_at,
      user: identity.user,
    });
  }
  if (data) {
    broadcastExtensionAuth({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      user: data.user,
    });
  }
}

/** Push Hub + Data Box JWT to E0001 when Tool tab is open and user is already signed in. */
export async function relayActiveSessionsToExtension(): Promise<void> {
  const [hubSession, dataResult] = await Promise.all([
    getHubIdentitySession(),
    supabase.auth.getSession(),
  ]);
  relaySessionsToExtension(hubSession, dataResult.data.session ?? null);
}
