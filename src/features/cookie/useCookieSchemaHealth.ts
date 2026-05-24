import { useCallback, useEffect, useState } from "react";
import { type CookieSchemaHealth, probeCookieSchemaHealth } from "./cookieSchemaHealth";

export function useCookieSchemaHealth(enabled = true) {
  const [health, setHealth] = useState<CookieSchemaHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<CookieSchemaHealth | null> => {
    if (!enabled) return null;
    setLoading(true);
    try {
      const next = await probeCookieSchemaHealth();
      setHealth(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { health, loading, refresh };
}
