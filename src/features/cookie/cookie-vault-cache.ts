import { createClientCache } from "@dev/hub-load";
import type { CookieVaultRow } from "./useCookieVaultMap";

export type CookieVaultMap = Record<string, CookieVaultRow>;

export const cookieVaultCache = createClientCache<CookieVaultMap>({
  key: "p0020:cookie:vault-map:v1",
  ttlMs: 15 * 60_000,
  persistLocal: false,
  validate: (data): data is CookieVaultMap =>
    typeof data === "object" && data !== null && !Array.isArray(data),
});
