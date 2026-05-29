import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { getOfflineMode, offlineSession } from "../../lib/offlineMode";

export function useNotesAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let unsub: (() => void) | null = null;

    const startSupabase = () => {
      if (!isSupabaseConfigured) {
        setSession(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!cancelled) {
          setSession(s);
          setLoading(false);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        if (!cancelled) setSession(s);
      });
      unsub = () => subscription.unsubscribe();
    };

    const syncOffline = () => {
      const nextOffline = getOfflineMode();
      if (cancelled) return;
      setOffline(nextOffline);
      if (nextOffline) {
        setSession(offlineSession());
        setLoading(false);
        if (unsub) unsub();
        unsub = null;
        return;
      }
      startSupabase();
    };

    syncOffline();
    window.addEventListener("p0020:offline-mode", syncOffline);
    window.addEventListener("storage", syncOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("p0020:offline-mode", syncOffline);
      window.removeEventListener("storage", syncOffline);
      if (unsub) unsub();
    };
  }, []);

  return { session, loading, isSupabaseConfigured, offline };
}
