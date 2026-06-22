function normalizeHost(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let host: string;
  try {
    if (/^https?:\/\//i.test(raw)) {
      host = new URL(raw).hostname;
    } else {
      host = raw.split("/")[0] ?? raw;
    }
  } catch {
    return null;
  }

  host = host.replace(/^\.+/, "").toLowerCase();
  if (!host || !host.includes(".")) return null;
  return host.replace(/^www\./, "");
}

/** Google Gmail routes share one cookie jar on `.google.com` — avoid duplicate routes. */
export function canonicalCookieRouteDomain(input: string): string | null {
  const host = normalizeHost(input);
  if (!host) return null;
  if (host === "google.com" || host.endsWith(".google.com")) return ".google.com";
  return `.${host}`;
}

/** Warn when user enters a deprecated Gmail subdomain route. */
export function deprecatedCookieRouteDomainHint(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw.includes("mail.google.com")) return null;
  return "Gmail routes use .google.com (shared cookie jar). Domain was normalized.";
}

/** Turn URL or hostname into cookie jar domain (e.g. https://www.facebook.com/ → .facebook.com) */
export function normalizeCookieDomain(input: string): string | null {
  return canonicalCookieRouteDomain(input);
}
