import { useEffect, useState } from "react";

/** True only after `value` stays true for `delayMs` — false immediately when `value` clears. */
export function useDelayedTrue(value: boolean, delayMs: number): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!value) {
      setDelayed(false);
      return;
    }
    const timer = window.setTimeout(() => setDelayed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return delayed;
}
