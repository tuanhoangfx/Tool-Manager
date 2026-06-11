import { createHubApiAuthToken } from "@tool-workspace/hub-identity";
import { getHubAccessToken, readHubIdentity } from "./hub-identity-session";
import { isHubSupabaseConfigured } from "./hub-supabase-env";
import { getHubIdentitySession, persistHubSession } from "./supabase-identity";

export const {
  API_UNAUTHORIZED_EVENT,
  dispatchApiUnauthorized,
  resolveRequestToken,
  refreshRequestToken,
} = createHubApiAuthToken({
  unauthorizedEventName: "p0020:api-unauthorized",
  isHubConfigured: () => isHubSupabaseConfigured,
  readHubIdentity,
  getHubAccessToken,
  getHubIdentitySession,
  persistHubSession,
});
