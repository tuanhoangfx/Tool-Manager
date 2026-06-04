import { normalizeCookieDomain } from "./normalizeCookieDomain";

/** Canonical domain key for route activity + vault (always `.host.tld`). */
export function cookieRouteDomainKey(input: string): string {
  return normalizeCookieDomain(input) ?? input.trim();
}
