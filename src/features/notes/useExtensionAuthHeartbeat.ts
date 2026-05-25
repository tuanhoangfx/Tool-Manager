import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { broadcastExtensionAuth } from "./shareUtils";

const HEARTBEAT_MS = 30 * 60 * 1000;

/** Keep extension JWT fresh while Tool is open (Cookie sync + Notes). */
export function useExtensionAuthHeartbeat(session: Session | null) {
  useEffect(() => {
    if (!session) return;

    const push = async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession();
      if (!s) return;
      broadcastExtensionAuth({
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_at: s.expires_at,
        user: s.user,
      });
    };

    void push();
    const id = window.setInterval(() => void push(), HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [session?.user?.id]);
}
