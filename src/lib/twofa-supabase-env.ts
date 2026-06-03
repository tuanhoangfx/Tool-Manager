/** Dedicated 2FA vault Supabase (separate project from Data Box Notes/Cookie). */

export const TWOFA_SUPABASE_URL =
  (import.meta.env.VITE_TWOFA_SUPABASE_URL as string | undefined)?.trim() ||
  "https://zurfouqanjcubgneuctp.supabase.co";

export const TWOFA_SUPABASE_ANON_KEY =
  (import.meta.env.VITE_TWOFA_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";

export const TWOFA_SUPABASE_PROJECT_REF = "zurfouqanjcubgneuctp";

export const isTwofaSupabaseConfigured = Boolean(TWOFA_SUPABASE_URL && TWOFA_SUPABASE_ANON_KEY);
