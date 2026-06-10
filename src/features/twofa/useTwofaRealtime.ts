import { useEffect, useRef, useState } from "react";
import { ensureTwofaAuth } from "../../lib/ensure-twofa-auth";
import { getTwofaStorageUserId } from "./storage";
import { addTwofaRealtimeListener } from "./twofa-realtime-hub";

/** Pull cloud delta when another tab/device mutates twofa_accounts. */
export function useTwofaRealtime(onChange: () => void, enabled = true) {
  const onChangeRef = useRef(onChange);
  const [userId, setUserId] = useState<string | null>(() =>
    enabled ? getTwofaStorageUserId() : null,
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled) {
      setUserId(null);
      return;
    }

    let cancelled = false;
    const resolveUser = async () => {
      const session = await ensureTwofaAuth();
      const uid = session?.user?.id ?? getTwofaStorageUserId();
      if (!cancelled && uid) setUserId(uid);
    };

    const cached = getTwofaStorageUserId();
    if (cached) setUserId(cached);
    void resolveUser();
    const onSession = () => void resolveUser();
    window.addEventListener("p0020:twofa-session", onSession);
    window.addEventListener("p0020:databox-session", onSession);
    return () => {
      cancelled = true;
      window.removeEventListener("p0020:twofa-session", onSession);
      window.removeEventListener("p0020:databox-session", onSession);
    };
  }, [enabled]);

  useEffect(() => {
    if (!userId || !enabled) return;
    return addTwofaRealtimeListener(userId, () => onChangeRef.current());
  }, [userId, enabled]);
}
