import {
  listCookieRouteActivity,
  type CookieRouteUserActivity,
} from "./cookieRouteActivityRepository";
import { cookieRouteDomainKey } from "./cookieRouteDomain";

const TTL_MS = 30_000;

type ActivityResult =
  | { ok: true; activities: CookieRouteUserActivity[] }
  | { ok: false; error: string };

type CacheEntry = {
  at: number;
  result: ActivityResult;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(noteId: string, domain: string) {
  return `${noteId}:${cookieRouteDomainKey(domain)}`;
}

export function invalidateCookieRouteActivity(noteId: string, domain: string) {
  cache.delete(cacheKey(noteId, domain));
}

export async function listCookieRouteActivityCached(
  noteId: string,
  domain: string,
): Promise<ActivityResult> {
  const key = cacheKey(noteId, domain);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.result;

  const result = await listCookieRouteActivity(noteId, domain);
  cache.set(key, { at: Date.now(), result });
  return result;
}
