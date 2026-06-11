import { createEnsureSupabaseAuth } from "@tool-workspace/hub-identity";
import { cacheDataBoxSession, readDataBoxSession } from "./data-box-session";
import { isSupabaseConfigured, supabase } from "./supabase";

export const ensureDataBoxAuth = createEnsureSupabaseAuth({
  isConfigured: () => isSupabaseConfigured,
  getClient: () => (isSupabaseConfigured ? supabase : null),
  readSnapshot: readDataBoxSession,
  cacheSession: cacheDataBoxSession,
});
