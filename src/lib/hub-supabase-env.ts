/** Tool Hub (P0004) public Supabase — workspace identity / user registry. */

export const HUB_SUPABASE_URL =
  (import.meta.env.VITE_HUB_SUPABASE_URL as string | undefined)?.trim() ||
  "https://fmnrafpzctuhxjaaomzt.supabase.co";

export const HUB_SUPABASE_ANON_KEY =
  (import.meta.env.VITE_HUB_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";

export const isHubSupabaseConfigured = Boolean(HUB_SUPABASE_URL && HUB_SUPABASE_ANON_KEY);
