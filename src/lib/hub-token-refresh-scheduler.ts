import { createHubTokenRefreshScheduler } from "@tool-workspace/hub-identity";
import { refreshRequestToken } from "./api-auth-token";
import { isHubSupabaseConfigured } from "./hub-supabase-env";

const scheduler = createHubTokenRefreshScheduler({
  isHubConfigured: () => isHubSupabaseConfigured,
  refreshRequestToken,
});

export const { startHubTokenRefreshScheduler, stopHubTokenRefreshScheduler } = scheduler;
