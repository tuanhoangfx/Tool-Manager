import { createEnsureSupabaseAuth } from "@tool-workspace/hub-identity";
import { cacheTwofaSession, readTwofaSession } from "./twofa-session";
import { getTwofaSupabase } from "./twofa-supabase";
import { isTwofaSupabaseConfigured } from "./twofa-supabase-env";

export const ensureTwofaAuth = createEnsureSupabaseAuth({
  isConfigured: () => isTwofaSupabaseConfigured,
  getClient: () => getTwofaSupabase(),
  readSnapshot: readTwofaSession,
  cacheSession: cacheTwofaSession,
  syncLiveSession: true,
});
