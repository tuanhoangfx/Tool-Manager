import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://yhnqwxejjkfgmjmiquhb.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobnF3eGVqamtmZ21qbWlxdWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjMxOTIsImV4cCI6MjA3ODU5OTE5Mn0.U_h3961ZbbF_udT4M2fyJsMpvk8f0bJaOvMo5Mr6O5s";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
