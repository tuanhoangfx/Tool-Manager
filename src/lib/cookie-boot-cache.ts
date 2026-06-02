import { createClientCache } from "@dev/hub-load";
import type { CookieSchemaHealth } from "../features/cookie/cookieSchemaHealth";
import type { CookieAgent, CookieAgentCommand } from "../features/cookie/cookieAgents";

export const cookieSchemaCache = createClientCache<CookieSchemaHealth>({
  key: "p0020:cookie:schema:v1",
  ttlMs: 10 * 60_000,
  validate: (data): data is CookieSchemaHealth =>
    typeof data === "object" && data !== null && typeof (data as CookieSchemaHealth).ok === "boolean",
});

export type CookieAgentsCachePayload = {
  agents: CookieAgent[];
  commands: CookieAgentCommand[];
};

export const cookieAgentsCache = createClientCache<CookieAgentsCachePayload>({
  key: "p0020:cookie:agents:v1",
  ttlMs: 2 * 60_000,
  validate: (data): data is CookieAgentsCachePayload =>
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as CookieAgentsCachePayload).agents),
});
