import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TWOFA_SUPABASE_ANON_KEY, TWOFA_SUPABASE_URL, isTwofaSupabaseConfigured } from "./twofa-supabase-env";

let client: SupabaseClient | null = null;

export function getTwofaSupabase(): SupabaseClient | null {
  if (!isTwofaSupabaseConfigured) return null;
  if (!client) {
    client = createClient(TWOFA_SUPABASE_URL, TWOFA_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/** @internal tests */
export function resetTwofaSupabaseClientForTests() {
  client = null;
}
