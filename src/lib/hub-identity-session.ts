import type { Session } from "@supabase/supabase-js";
import {
  cacheHubIdentity,
  isHubSyntheticEmail,
  readHubIdentity,
  type HubIdentitySnapshot,
} from "@tool-workspace/hub-identity";
import { HUB_SUPABASE_ANON_KEY, HUB_SUPABASE_URL } from "./hub-supabase-env";

export {
  type HubIdentitySnapshot,
  type HubIdentityChangeDetail,
  HUB_IDENTITY_EVENT,
  HUB_IDENTITY_STORAGE_KEY,
  cacheHubIdentity,
  clearHubIdentity,
  getHubAccessToken,
  readHubIdentity,
  snapshotFromSupabaseSession,
  subscribeHubIdentity,
} from "@tool-workspace/hub-identity";

/** Data Box-only session (magic link) — keep header email without a Hub JWT. */
export function ensureHubIdentityStubFromDataSession(session: Session | null | undefined): void {
  if (!session?.user?.email || readHubIdentity()) return;
  const email = session.user.email.trim().toLowerCase();
  if (!isHubSyntheticEmail(email)) return;
  cacheHubIdentity(
    {
      access_token: "",
      refresh_token: "",
      expires_at: session.expires_at ?? null,
      user_id: null,
      user_email: email,
      supabase_url: HUB_SUPABASE_URL,
      supabase_anon_key: HUB_SUPABASE_ANON_KEY,
    },
    "p0020-stub",
  );
}
