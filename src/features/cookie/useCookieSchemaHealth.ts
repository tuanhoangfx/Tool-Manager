import { useCallback, useEffect, useState } from "react";
import { cookieSchemaCache } from "../../lib/cookie-boot-cache";
import { type CookieSchemaHealth, probeCookieSchemaHealth } from "./cookieSchemaHealth";

export function useCookieSchemaHealth(enabled = true) {
  const [health, setHealth] = useState<CookieSchemaHealth | null>(() =>
    enabled ? cookieSchemaCache.readStale() : null,
  );
  const [loading, setLoading] = useState(() => enabled && cookieSchemaCache.readStale() == null);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }): Promise<CookieSchemaHealth | null> => {
      if (!enabled) return null;
      const silent = opts?.silent ?? health != null;
      if (!silent) setLoading(true);
      try {
        const next = await probeCookieSchemaHealth();
        setHealth(next);
        cookieSchemaCache.write(next);
        return next;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [enabled, health],
  );

  useEffect(() => {
    const stale = cookieSchemaCache.readStale();
    void refresh({ silent: stale != null });
  }, [refresh]);

  return { health, loading, refresh };
}
