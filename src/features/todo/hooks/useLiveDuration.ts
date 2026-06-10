import { useEffect, useState } from "react";

/** Live elapsed ms — ticks only when enabled (perf: skip idle/done cards). */
export function useLiveDuration(startIso: string, enabled: boolean, frozenMs?: number) {
  const [duration, setDuration] = useState(() => {
    if (frozenMs != null) return frozenMs;
    if (!enabled) return 0;
    return Math.max(0, Date.now() - new Date(startIso).getTime());
  });

  useEffect(() => {
    if (frozenMs != null) {
      setDuration(frozenMs);
      return;
    }
    if (!enabled) {
      setDuration(0);
      return;
    }
    const start = new Date(startIso).getTime();
    const tick = () => setDuration(Math.max(0, Date.now() - start));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startIso, enabled, frozenMs]);

  return duration;
}
