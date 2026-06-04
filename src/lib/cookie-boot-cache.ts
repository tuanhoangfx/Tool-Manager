import { createClientCache } from "@dev/hub-load";
import type { CookieSchemaHealth } from "../features/cookie/cookieSchemaHealth";

export const cookieSchemaCache = createClientCache<CookieSchemaHealth>({
  key: "p0020:cookie:schema:v1",
  ttlMs: 10 * 60_000,
  validate: (data): data is CookieSchemaHealth =>
    typeof data === "object" && data !== null && typeof (data as CookieSchemaHealth).ok === "boolean",
});
