import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { addNotesCookieListener } from "./notesCookieRealtimeHub";

/** Refresh when extension RPC updates cookie_snapshot / sync_status (shared channel). */
export function useNotesCookieRealtime(session: Session | null, onChange: () => void, enabled = true) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId || !enabled) return;
    return addNotesCookieListener(userId, () => onChangeRef.current());
  }, [userId, enabled]);
}
